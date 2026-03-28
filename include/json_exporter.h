#ifndef JSON_EXPORTER_H
#define JSON_EXPORTER_H

// ============================================================================
// JSON Exporter — Serializes DPI analysis results to a JSON file.
//
// Output structure is designed to match the FastAPI response models
// (StatsResponse, FlowsResponse, SNIResponse) so the API can serve
// real analysis data directly from the file.
//
// No external JSON library dependency: uses manual serialization via
// ostringstream, which is sufficient for the flat schemas we produce.
// ============================================================================

#include "types.h"
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

namespace DPI {

// IP helper — converts a network-order uint32_t to dotted-decimal string.
inline std::string ipToString(uint32_t ip) {
    std::ostringstream s;
    s << ((ip >>  0) & 0xFF) << "."
      << ((ip >>  8) & 0xFF) << "."
      << ((ip >> 16) & 0xFF) << "."
      << ((ip >> 24) & 0xFF);
    return s.str();
}

// Escape special characters for JSON string values.
inline std::string jsonEscape(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 8);
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            case '\r': out += "\\r";  break;
            case '\t': out += "\\t";  break;
            default:   out += c;
        }
    }
    return out;
}

// ---- Aggregate data structures for export ----

struct FlowExport {
    uint32_t src_ip;
    uint32_t dst_ip;
    uint16_t src_port;
    uint16_t dst_port;
    uint8_t  protocol;   // 6 = TCP, 17 = UDP
    AppType  app_type;
    uint64_t packets;
    uint64_t bytes;
    bool     blocked;
};

struct DomainExport {
    std::string domain;
    AppType     app;
    uint64_t    flow_count;
    uint64_t    total_bytes;
    bool        blocked;
};

struct StatsExport {
    uint64_t total_packets;
    uint64_t total_bytes;
    uint64_t active_flows;
    uint64_t blocked_packets;
    uint64_t tcp_packets;
    uint64_t udp_packets;
    uint64_t other_packets;
    double   capture_duration_sec;
    double   packets_per_sec;
};

// ---- Main export function ----

inline bool exportToJSON(
    const std::string& output_path,
    const StatsExport& stats,
    const std::vector<FlowExport>& flows,
    const std::vector<DomainExport>& domains
) {
    std::ofstream out(output_path);
    if (!out.is_open()) return false;

    std::ostringstream json;
    json << std::fixed << std::setprecision(2);

    // ---- Root object ----
    json << "{\n";

    // ---- stats ----
    json << "  \"stats\": {\n"
         << "    \"total_packets\": "       << stats.total_packets << ",\n"
         << "    \"total_bytes\": "         << stats.total_bytes << ",\n"
         << "    \"active_flows\": "        << stats.active_flows << ",\n"
         << "    \"blocked_packets\": "     << stats.blocked_packets << ",\n"
         << "    \"protocols\": {\n"
         << "      \"tcp\": "              << stats.tcp_packets << ",\n"
         << "      \"udp\": "              << stats.udp_packets << ",\n"
         << "      \"other\": "            << stats.other_packets << "\n"
         << "    },\n"
         << "    \"capture_duration_sec\": " << stats.capture_duration_sec << ",\n"
         << "    \"packets_per_sec\": "     << stats.packets_per_sec << "\n"
         << "  },\n";

    // ---- flows ----
    json << "  \"total_flows\": " << flows.size() << ",\n"
         << "  \"flows\": [\n";
    for (size_t i = 0; i < flows.size(); ++i) {
        const auto& f = flows[i];
        std::string proto = (f.protocol == 6) ? "TCP" : (f.protocol == 17) ? "UDP" : "OTHER";
        json << "    {\n"
             << "      \"src_ip\": \""   << ipToString(f.src_ip)   << "\",\n"
             << "      \"dst_ip\": \""   << ipToString(f.dst_ip)   << "\",\n"
             << "      \"src_port\": "   << f.src_port             << ",\n"
             << "      \"dst_port\": "   << f.dst_port             << ",\n"
             << "      \"protocol\": \"" << proto                  << "\",\n"
             << "      \"app\": \""      << jsonEscape(appTypeToString(f.app_type)) << "\",\n"
             << "      \"packets\": "    << f.packets              << ",\n"
             << "      \"bytes\": "      << f.bytes                << ",\n"
             << "      \"blocked\": "    << (f.blocked ? "true" : "false") << "\n"
             << "    }" << (i + 1 < flows.size() ? "," : "") << "\n";
    }
    json << "  ],\n";

    // ---- domains ----
    json << "  \"total_domains\": " << domains.size() << ",\n"
         << "  \"domains\": [\n";
    for (size_t i = 0; i < domains.size(); ++i) {
        const auto& d = domains[i];
        json << "    {\n"
             << "      \"domain\": \""     << jsonEscape(d.domain)                    << "\",\n"
             << "      \"app\": \""        << jsonEscape(appTypeToString(d.app))      << "\",\n"
             << "      \"flow_count\": "   << d.flow_count                            << ",\n"
             << "      \"total_bytes\": "  << d.total_bytes                           << ",\n"
             << "      \"blocked\": "      << (d.blocked ? "true" : "false")          << "\n"
             << "    }" << (i + 1 < domains.size() ? "," : "") << "\n";
    }
    json << "  ]\n";

    json << "}\n";

    out << json.str();
    out.close();
    return true;
}

} // namespace DPI

#endif // JSON_EXPORTER_H
