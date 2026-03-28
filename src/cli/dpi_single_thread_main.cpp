// Single-threaded DPI Engine CLI - reference implementation
#include <iostream>
#include <fstream>
#include <unordered_map>
#include <vector>
#include <iomanip>
#include <unordered_set>
#include <algorithm>
#include <chrono>

#include "pcap_reader.h"
#include "packet_parser.h"
#include "sni_extractor.h"
#include "types.h"
#include "json_exporter.h"

using namespace PacketAnalyzer;
using namespace DPI;

namespace {

struct Flow {
    FiveTuple tuple;
    AppType app_type = AppType::UNKNOWN;
    std::string sni;
    uint64_t packets = 0;
    uint64_t bytes = 0;
    bool blocked = false;
    uint64_t tcp_packets = 0;
    uint64_t udp_packets = 0;
};

class BlockingRules {
public:
    std::unordered_set<uint32_t> blocked_ips;
    std::unordered_set<AppType> blocked_apps;
    std::vector<std::string> blocked_domains;  // Simple substring match

    void blockIP(const std::string& ip) {
        uint32_t addr = parseIP(ip);
        blocked_ips.insert(addr);
        std::cout << "[Rules] Blocked IP: " << ip << "\n";
    }

    void blockApp(const std::string& app) {
        for (int i = 0; i < static_cast<int>(AppType::APP_COUNT); i++) {
            if (appTypeToString(static_cast<AppType>(i)) == app) {
                blocked_apps.insert(static_cast<AppType>(i));
                std::cout << "[Rules] Blocked app: " << app << "\n";
                return;
            }
        }
        std::cerr << "[Rules] Unknown app: " << app << "\n";
    }

    void blockDomain(const std::string& domain) {
        blocked_domains.push_back(domain);
        std::cout << "[Rules] Blocked domain: " << domain << "\n";
    }

    bool isBlocked(uint32_t src_ip, AppType app, const std::string& sni) const {
        if (blocked_ips.count(src_ip)) return true;
        if (blocked_apps.count(app)) return true;
        for (const auto& dom : blocked_domains) {
            if (sni.find(dom) != std::string::npos) return true;
        }
        return false;
    }

private:
    static uint32_t parseIP(const std::string& ip) {
        uint32_t result = 0;
        int octet = 0, shift = 0;
        for (char c : ip) {
            if (c == '.') {
                result |= (octet << shift);
                shift += 8;
                octet = 0;
            } else if (c >= '0' && c <= '9') {
                octet = octet * 10 + (c - '0');
            }
        }
        return result | (octet << shift);
    }
};

void printUsage(const char* prog) {
    std::cout << R"(
Single-threaded DPI Engine
==========================

Usage: )" << prog << R"( <input.pcap> <output.pcap> [options]

Options:
  --block-ip <ip>        Block traffic from source IP
  --block-app <app>      Block application (YouTube, Facebook, etc.)
  --block-domain <dom>   Block domain (substring match)
  --json <path>          Export results as JSON (default: output.json)

Example:
  )" << prog << R"( capture.pcap filtered.pcap --block-app YouTube --json output.json
)";
}

} // namespace

int main(int argc, char* argv[]) {
    if (argc < 3) {
        printUsage(argv[0]);
        return 1;
    }

    std::string input_file = argv[1];
    std::string output_file = argv[2];

    BlockingRules rules;
    std::string json_output_path = "output.json";   // default
    bool export_json = false;

    // Parse options
    for (int i = 3; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--block-ip" && i + 1 < argc) {
            rules.blockIP(argv[++i]);
        } else if (arg == "--block-app" && i + 1 < argc) {
            rules.blockApp(argv[++i]);
        } else if (arg == "--block-domain" && i + 1 < argc) {
            rules.blockDomain(argv[++i]);
        } else if (arg == "--json") {
            export_json = true;
            if (i + 1 < argc && argv[i + 1][0] != '-') {
                json_output_path = argv[++i];
            }
        }
    }

    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║            Single-threaded DPI Engine (reference)            ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n\n";

    // Open input
    PcapReader reader;
    if (!reader.open(input_file)) {
        return 1;
    }

    // Open output
    std::ofstream output(output_file, std::ios::binary);
    if (!output.is_open()) {
        std::cerr << "Error: Cannot open output file\n";
        return 1;
    }

    // Write PCAP header
    const auto& header = reader.getGlobalHeader();
    output.write(reinterpret_cast<const char*>(&header), sizeof(header));

    std::unordered_map<FiveTuple, Flow, FiveTupleHash> flows;

    uint64_t total_packets = 0;
    uint64_t total_bytes = 0;
    uint64_t forwarded = 0;
    uint64_t dropped = 0;
    uint64_t tcp_packets = 0;
    uint64_t udp_packets = 0;
    uint64_t other_packets = 0;
    std::unordered_map<AppType, uint64_t> app_stats;

    RawPacket raw;
    ParsedPacket parsed;

    auto start_time = std::chrono::steady_clock::now();
    std::cout << "[DPI] Processing packets...\n";

    while (reader.readNextPacket(raw)) {
        total_packets++;
        total_bytes += raw.data.size();

        if (!PacketParser::parse(raw, parsed)) {
            other_packets++;
            continue;
        }
        if (!parsed.has_ip || (!parsed.has_tcp && !parsed.has_udp)) continue;

        // Create five-tuple
        FiveTuple tuple;
        auto parseIP = [](const std::string& ip) -> uint32_t {
            uint32_t result = 0;
            int octet = 0, shift = 0;
            for (char c : ip) {
                if (c == '.') {
                    result |= (octet << shift);
                    shift += 8;
                    octet = 0;
                } else if (c >= '0' && c <= '9') {
                    octet = octet * 10 + (c - '0');
                }
            }
            return result | (octet << shift);
        };

        tuple.src_ip = parseIP(parsed.src_ip);
        tuple.dst_ip = parseIP(parsed.dest_ip);
        tuple.src_port = parsed.src_port;
        tuple.dst_port = parsed.dest_port;
        tuple.protocol = parsed.protocol;

        // Get or create flow
        Flow& flow = flows[tuple];
        if (flow.packets == 0) {
            flow.tuple = tuple;
        }
        flow.packets++;
        flow.bytes += raw.data.size();

        // Track protocol stats
        if (parsed.protocol == 6) {
            tcp_packets++;
            flow.tcp_packets++;
        } else if (parsed.protocol == 17) {
            udp_packets++;
            flow.udp_packets++;
        } else {
            other_packets++;
        }

        // Try SNI extraction - even for flows already marked as generic HTTPS
        if ((flow.app_type == AppType::UNKNOWN || flow.app_type == AppType::HTTPS) &&
            flow.sni.empty() && parsed.has_tcp && parsed.dest_port == 443) {

            size_t payload_offset = 14;
            uint8_t ip_ihl = raw.data[14] & 0x0F;
            payload_offset += ip_ihl * 4;

            if (payload_offset + 12 < raw.data.size()) {
                uint8_t tcp_offset = (raw.data[payload_offset + 12] >> 4) & 0x0F;
                payload_offset += tcp_offset * 4;

                if (payload_offset < raw.data.size()) {
                    size_t payload_len = raw.data.size() - payload_offset;
                    if (payload_len > 5) {  // Minimum TLS record header
                        auto sni = SNIExtractor::extract(raw.data.data() + payload_offset, payload_len);
                        if (sni) {
                            flow.sni = *sni;
                            flow.app_type = sniToAppType(*sni);
                        }
                    }
                }
            }
        }

        // HTTP Host extraction
        if ((flow.app_type == AppType::UNKNOWN || flow.app_type == AppType::HTTP) &&
            flow.sni.empty() && parsed.has_tcp && parsed.dest_port == 80) {

            size_t payload_offset = 14;
            uint8_t ip_ihl = raw.data[14] & 0x0F;
            payload_offset += ip_ihl * 4;

            if (payload_offset + 12 < raw.data.size()) {
                uint8_t tcp_offset = (raw.data[payload_offset + 12] >> 4) & 0x0F;
                payload_offset += tcp_offset * 4;

                if (payload_offset < raw.data.size()) {
                    size_t payload_len = raw.data.size() - payload_offset;
                    auto host = HTTPHostExtractor::extract(raw.data.data() + payload_offset, payload_len);
                    if (host) {
                        flow.sni = *host;
                        flow.app_type = sniToAppType(*host);
                    }
                }
            }
        }

        // DNS classification
        if (flow.app_type == AppType::UNKNOWN &&
            (parsed.dest_port == 53 || parsed.src_port == 53)) {
            flow.app_type = AppType::DNS;
        }

        // Port-based fallback
        if (flow.app_type == AppType::UNKNOWN) {
            if (parsed.dest_port == 443) flow.app_type = AppType::HTTPS;
            else if (parsed.dest_port == 80) flow.app_type = AppType::HTTP;
        }

        // Check blocking rules
        if (!flow.blocked) {
            flow.blocked = rules.isBlocked(tuple.src_ip, flow.app_type, flow.sni);
            if (flow.blocked) {
                std::cout << "[BLOCKED] " << parsed.src_ip << " -> " << parsed.dest_ip
                          << " (" << appTypeToString(flow.app_type);
                if (!flow.sni.empty()) std::cout << ": " << flow.sni;
                std::cout << ")\n";
            }
        }

        // Update app stats
        app_stats[flow.app_type]++;

        // Forward or drop
        if (flow.blocked) {
            dropped++;
        } else {
            forwarded++;
            PcapPacketHeader pkt_hdr;
            pkt_hdr.ts_sec = raw.header.ts_sec;
            pkt_hdr.ts_usec = raw.header.ts_usec;
            pkt_hdr.incl_len = raw.data.size();
            pkt_hdr.orig_len = raw.data.size();
            output.write(reinterpret_cast<const char*>(&pkt_hdr), sizeof(pkt_hdr));
            output.write(reinterpret_cast<const char*>(raw.data.data()), raw.data.size());
        }
    }

    reader.close();
    output.close();

    auto end_time = std::chrono::steady_clock::now();
    double duration_sec = std::chrono::duration<double>(end_time - start_time).count();
    double pps = (duration_sec > 0) ? total_packets / duration_sec : 0;

    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║                      PROCESSING REPORT                       ║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ Total Packets:      " << std::setw(10) << total_packets << "                             ║\n";
    std::cout << "║ Forwarded:          " << std::setw(10) << forwarded << "                             ║\n";
    std::cout << "║ Dropped:            " << std::setw(10) << dropped << "                             ║\n";
    std::cout << "║ Active Flows:       " << std::setw(10) << flows.size() << "                             ║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    std::cout << "║                    APPLICATION BREAKDOWN                     ║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════╣\n";

    std::vector<std::pair<AppType, uint64_t>> sorted_apps(app_stats.begin(), app_stats.end());
    std::sort(sorted_apps.begin(), sorted_apps.end(),
              [](const auto& a, const auto& b) { return a.second > b.second; });

    for (const auto& [app, count] : sorted_apps) {
        double pct = 100.0 * count / total_packets;
        int bar_len = static_cast<int>(pct / 5);
        std::string bar(bar_len, '#');

        std::cout << "║ " << std::setw(15) << std::left << appTypeToString(app)
                  << std::setw(8) << std::right << count
                  << " " << std::setw(5) << std::fixed << std::setprecision(1) << pct << "% "
                  << std::setw(20) << std::left << bar << "  ║\n";
    }

    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    std::cout << "\n[Detected Applications/Domains]\n";
    std::unordered_map<std::string, AppType> unique_snis;
    for (const auto& [tuple, flow] : flows) {
        if (!flow.sni.empty()) {
            unique_snis[flow.sni] = flow.app_type;
        }
    }
    for (const auto& [sni, app] : unique_snis) {
        std::cout << "  - " << sni << " -> " << appTypeToString(app) << "\n";
    }

    std::cout << "\nOutput written to: " << output_file << "\n";

    // ---- JSON Export ----
    if (export_json) {
        // Build stats
        DPI::StatsExport stats_exp{};
        stats_exp.total_packets       = total_packets;
        stats_exp.total_bytes         = total_bytes;
        stats_exp.active_flows        = flows.size();
        stats_exp.blocked_packets     = dropped;
        stats_exp.tcp_packets         = tcp_packets;
        stats_exp.udp_packets         = udp_packets;
        stats_exp.other_packets       = other_packets;
        stats_exp.capture_duration_sec = duration_sec;
        stats_exp.packets_per_sec     = pps;

        // Build flows
        std::vector<DPI::FlowExport> flow_exports;
        flow_exports.reserve(flows.size());
        for (const auto& [tuple, flow] : flows) {
            DPI::FlowExport fe{};
            fe.src_ip   = tuple.src_ip;
            fe.dst_ip   = tuple.dst_ip;
            fe.src_port = tuple.src_port;
            fe.dst_port = tuple.dst_port;
            fe.protocol = tuple.protocol;
            fe.app_type = flow.app_type;
            fe.packets  = flow.packets;
            fe.bytes    = flow.bytes;
            fe.blocked  = flow.blocked;
            flow_exports.push_back(fe);
        }

        // Build domains — aggregate by SNI
        struct DomAgg { AppType app; uint64_t flow_count; uint64_t total_bytes; bool blocked; };
        std::unordered_map<std::string, DomAgg> dom_map;
        for (const auto& [tuple, flow] : flows) {
            if (flow.sni.empty()) continue;
            auto& d = dom_map[flow.sni];
            d.app = flow.app_type;
            d.flow_count++;
            d.total_bytes += flow.bytes;
            if (flow.blocked) d.blocked = true;
        }
        std::vector<DPI::DomainExport> domain_exports;
        domain_exports.reserve(dom_map.size());
        for (const auto& [domain, agg] : dom_map) {
            domain_exports.push_back({domain, agg.app, agg.flow_count, agg.total_bytes, agg.blocked});
        }

        if (DPI::exportToJSON(json_output_path, stats_exp, flow_exports, domain_exports)) {
            std::cout << "[JSON] Exported analysis results to: " << json_output_path << "\n";
        } else {
            std::cerr << "[JSON] ERROR: Failed to write " << json_output_path << "\n";
        }
    }

    return 0;
}

