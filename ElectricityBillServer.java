import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ElectricityBillServer
 * -------------------------------------------------------------------------
 * A lightweight, dependency-free HTTP Server built using Core Java's
 * com.sun.net.httpserver.HttpServer.
 *
 * Designed for a College Java Micro-Project:
 * 1. Serves the modern frontend (index.html, style.css, script.js) at http://localhost:8080/
 * 2. Exposes REST API endpoint POST /api/calculate for electricity bill calculations.
 * 3. Exposes GET /api/health for system connectivity verification.
 * 4. Implements progressive tariff calculation logic and input validation.
 * -------------------------------------------------------------------------
 */
public class ElectricityBillServer {

    private static final int PORT = 8080;
    private static int billCounter = 1001;

    public static void main(String[] args) {
        try {
            // Create HTTP Server listening on port 8080
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

            // API Endpoints
            server.createContext("/api/calculate", new CalculateBillHandler());
            server.createContext("/api/health", new HealthCheckHandler());

            // Static Web File Server (Root handler for serving HTML, CSS, JS)
            server.createContext("/", new StaticFileHandler());

            // Use default executor (null creates a default single-threaded or light executor)
            server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());

            server.start();

            System.out.println("===============================================================");
            System.out.println("   ⚡ ELECTRICITY BILL ESTIMATOR - JAVA BACKEND SERVER ⚡    ");
            System.out.println("===============================================================");
            System.out.println("   Status   : Server successfully started!");
            System.out.println("   Address  : http://localhost:" + PORT + "/");
            System.out.println("   API Docs : POST http://localhost:" + PORT + "/api/calculate");
            System.out.println("   Health   : GET  http://localhost:" + PORT + "/api/health");
            System.out.println("===============================================================");
            System.out.println("   Open your browser and navigate to: http://localhost:" + PORT);
            System.out.println("   Press Ctrl + C in this terminal to stop the server.");
            System.out.println("===============================================================");

        } catch (IOException e) {
            System.err.println("❌ Failed to start server on port " + PORT + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    // =========================================================================
    // 1. BILL CALCULATION API HANDLER
    // =========================================================================
    static class CalculateBillHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // Add CORS Headers for all responses
            setCorsHeaders(exchange);

            // Handle Preflight OPTIONS request
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            // Only allow POST method
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, "{\"success\":false,\"message\":\"Method Not Allowed. Use POST.\"}");
                return;
            }

            try {
                // Read request body
                InputStream is = exchange.getRequestBody();
                String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);

                if (body == null || body.trim().isEmpty()) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Request body cannot be empty.\"}");
                    return;
                }

                // Parse JSON payload (Pure Core Java without external libraries)
                Map<String, String> jsonMap = SimpleJsonParser.parse(body);

                String consumerName = jsonMap.get("consumerName");
                String consumerNumber = jsonMap.get("consumerNumber");
                String billingPeriod = jsonMap.get("billingPeriod");
                String prevReadingStr = jsonMap.get("previousReading");
                String currReadingStr = jsonMap.get("currentReading");

                // Validate Consumer Name
                if (consumerName == null || consumerName.trim().isEmpty()) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Consumer name is required and cannot be empty.\"}");
                    return;
                }
                consumerName = consumerName.trim();

                // Validate readings presence
                if (prevReadingStr == null || currReadingStr == null) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Both previous reading and current reading are required.\"}");
                    return;
                }

                double previousReading;
                double currentReading;

                // Validate numeric values
                try {
                    previousReading = Double.parseDouble(prevReadingStr.trim());
                    currentReading = Double.parseDouble(currReadingStr.trim());
                } catch (NumberFormatException nfe) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Meter readings must be valid numeric values.\"}");
                    return;
                }

                // Check for NaN or Infinite
                if (Double.isNaN(previousReading) || Double.isInfinite(previousReading) ||
                    Double.isNaN(currentReading) || Double.isInfinite(currentReading)) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Meter readings cannot be NaN or Infinite.\"}");
                    return;
                }

                // Validate non-negative readings
                if (previousReading < 0) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Previous meter reading cannot be negative (" + previousReading + ").\"}");
                    return;
                }

                if (currentReading < 0) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Current meter reading cannot be negative (" + currentReading + ").\"}");
                    return;
                }

                // Validate current reading >= previous reading
                if (currentReading < previousReading) {
                    sendJsonResponse(exchange, 400, "{\"success\":false,\"message\":\"Current reading (" + currentReading + ") cannot be less than previous reading (" + previousReading + ").\"}");
                    return;
                }

                // Calculate units consumed
                double unitsConsumed = currentReading - previousReading;

                // Default billing period if omitted
                if (billingPeriod == null || billingPeriod.trim().isEmpty()) {
                    billingPeriod = new SimpleDateFormat("MMMM yyyy", Locale.ENGLISH).format(new Date());
                } else {
                    billingPeriod = billingPeriod.trim();
                }

                // Default consumer number if omitted
                if (consumerNumber == null || consumerNumber.trim().isEmpty()) {
                    consumerNumber = "EB-" + (10000 + (int)(Math.random() * 90000));
                } else {
                    consumerNumber = consumerNumber.trim();
                }

                // Progressive Tariff Slabs Calculation
                // Slab 1: First 100 units @ ₹2.00 per unit
                // Slab 2: Next 100 units (101-200) @ ₹3.00 per unit
                // Slab 3: Units above 200 (>200) @ ₹5.00 per unit
                List<TariffSlab> slabs = calculateTariffSlabs(unitsConsumed);

                double totalEnergyCharge = 0.0;
                for (TariffSlab slab : slabs) {
                    totalEnergyCharge += slab.amount;
                }

                // Generate Bill ID and Timestamp
                String billId = "BILL-" + new SimpleDateFormat("yyyyMMdd").format(new Date()) + "-" + (billCounter++);
                String generatedAt = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());

                // Build JSON Response
                StringBuilder jsonResponse = new StringBuilder();
                jsonResponse.append("{");
                jsonResponse.append("\"success\":true,");
                jsonResponse.append("\"message\":\"Bill calculated successfully\",");
                jsonResponse.append("\"data\":{");
                jsonResponse.append("\"billId\":").append(escapeJson(billId)).append(",");
                jsonResponse.append("\"generatedAt\":").append(escapeJson(generatedAt)).append(",");
                jsonResponse.append("\"consumerName\":").append(escapeJson(consumerName)).append(",");
                jsonResponse.append("\"consumerNumber\":").append(escapeJson(consumerNumber)).append(",");
                jsonResponse.append("\"billingPeriod\":").append(escapeJson(billingPeriod)).append(",");
                jsonResponse.append("\"previousReading\":").append(formatNumber(previousReading)).append(",");
                jsonResponse.append("\"currentReading\":").append(formatNumber(currentReading)).append(",");
                jsonResponse.append("\"unitsConsumed\":").append(formatNumber(unitsConsumed)).append(",");
                jsonResponse.append("\"totalEnergyCharge\":").append(formatNumber(totalEnergyCharge)).append(",");
                jsonResponse.append("\"totalBill\":").append(formatNumber(totalEnergyCharge)).append(",");
                jsonResponse.append("\"currency\":\"INR\",");
                jsonResponse.append("\"currencySymbol\":\"₹\",");
                jsonResponse.append("\"slabs\":[");

                for (int i = 0; i < slabs.size(); i++) {
                    TariffSlab s = slabs.get(i);
                    jsonResponse.append("{");
                    jsonResponse.append("\"slabName\":").append(escapeJson(s.name)).append(",");
                    jsonResponse.append("\"range\":").append(escapeJson(s.range)).append(",");
                    jsonResponse.append("\"rate\":").append(formatNumber(s.rate)).append(",");
                    jsonResponse.append("\"units\":").append(formatNumber(s.units)).append(",");
                    jsonResponse.append("\"amount\":").append(formatNumber(s.amount));
                    jsonResponse.append("}");
                    if (i < slabs.size() - 1) {
                        jsonResponse.append(",");
                    }
                }

                jsonResponse.append("]");
                jsonResponse.append("}");
                jsonResponse.append("}");

                sendJsonResponse(exchange, 200, jsonResponse.toString());

            } catch (Exception e) {
                e.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"success\":false,\"message\":\"Internal Server Error: " + escapeJsonString(e.getMessage()) + "\"}");
            }
        }
    }

    // =========================================================================
    // 2. PROGRESSIVE TARIFF CALCULATION ENGINE
    // =========================================================================
    static class TariffSlab {
        String name;
        String range;
        double rate;
        double units;
        double amount;

        TariffSlab(String name, String range, double rate, double units, double amount) {
            this.name = name;
            this.range = range;
            this.rate = rate;
            this.units = units;
            this.amount = amount;
        }
    }

    /**
     * Progressive Tariff Calculation Formula:
     * - First 100 units (1 - 100): ₹2.00 per unit
     * - Next 100 units (101 - 200): ₹3.00 per unit
     * - Units above 200 (> 200): ₹5.00 per unit
     */
    public static List<TariffSlab> calculateTariffSlabs(double unitsConsumed) {
        List<TariffSlab> slabs = new ArrayList<>();

        double remainingUnits = unitsConsumed;

        // Slab 1: First 100 units @ ₹2/unit
        double slab1Units = Math.min(remainingUnits, 100.0);
        if (slab1Units < 0) slab1Units = 0;
        double slab1Amount = slab1Units * 2.0;
        slabs.add(new TariffSlab("Slab 1 (First 100 units)", "0 - 100 units", 2.0, slab1Units, slab1Amount));
        remainingUnits -= slab1Units;

        // Slab 2: Next 100 units @ ₹3/unit (101 to 200)
        double slab2Units = Math.min(Math.max(remainingUnits, 0.0), 100.0);
        double slab2Amount = slab2Units * 3.0;
        slabs.add(new TariffSlab("Slab 2 (Next 100 units)", "101 - 200 units", 3.0, slab2Units, slab2Amount));
        remainingUnits -= slab2Units;

        // Slab 3: Above 200 units @ ₹5/unit
        double slab3Units = Math.max(remainingUnits, 0.0);
        double slab3Amount = slab3Units * 5.0;
        slabs.add(new TariffSlab("Slab 3 (Above 200 units)", "> 200 units", 5.0, slab3Units, slab3Amount));

        return slabs;
    }

    // =========================================================================
    // 3. HEALTH CHECK API HANDLER
    // =========================================================================
    static class HealthCheckHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            String healthJson = "{\"status\":\"UP\",\"server\":\"Core Java HttpServer (com.sun.net.httpserver)\",\"timestamp\":\"" 
                                + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()) + "\"}";
            sendJsonResponse(exchange, 200, healthJson);
        }
    }

    // =========================================================================
    // 4. STATIC FILE SERVER (Serves index.html, style.css, script.js)
    // =========================================================================
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath();
            if (path == null || path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            // Remove leading slash
            String sanitizedPath = path.startsWith("/") ? path.substring(1) : path;

            // Prevent path traversal attacks
            if (sanitizedPath.contains("..")) {
                sendErrorResponse(exchange, 403, "Access Denied");
                return;
            }

            // Look for file in current working directory
            File file = new File(sanitizedPath);
            if (!file.exists() || file.isDirectory()) {
                // If not found in current directory, try relative to current directory
                file = new File(".", sanitizedPath);
            }

            if (!file.exists() || file.isDirectory()) {
                sendErrorResponse(exchange, 404, "404 Not Found: " + path);
                return;
            }

            // Determine Content-Type
            String contentType = getMimeType(sanitizedPath);
            exchange.getResponseHeaders().set("Content-Type", contentType);

            // Read file and stream to client
            byte[] fileBytes;
            try (FileInputStream fis = new FileInputStream(file)) {
                fileBytes = fis.readAllBytes();
            }

            exchange.sendResponseHeaders(200, fileBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(fileBytes);
            }
        }

        private String getMimeType(String filename) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=UTF-8";
            if (lower.endsWith(".css")) return "text/css; charset=UTF-8";
            if (lower.endsWith(".js")) return "application/javascript; charset=UTF-8";
            if (lower.endsWith(".json")) return "application/json; charset=UTF-8";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".ico")) return "image/x-icon";
            return "text/plain; charset=UTF-8";
        }
    }

    // =========================================================================
    // 5. HELPER UTILITIES: JSON PARSER, CORS, FORMATTING
    // =========================================================================

    /**
     * Minimalist, robust JSON parser using standard Core Java.
     * Extracts top-level key-value string/number pairs without external dependencies like Jackson/Gson.
     */
    static class SimpleJsonParser {
        public static Map<String, String> parse(String json) {
            Map<String, String> map = new HashMap<>();
            if (json == null) return map;

            // Regex pattern to match "key" : "value" OR "key" : 123.45 OR "key" : null/true/false
            Pattern pattern = Pattern.compile("\"([^\"]+)\"\\s*:\\s*(?:\"([^\"]*)\"|([0-9.-]+|true|false|null))");
            Matcher matcher = pattern.matcher(json);

            while (matcher.find()) {
                String key = matcher.group(1);
                String stringVal = matcher.group(2);
                String primitiveVal = matcher.group(3);

                if (stringVal != null) {
                    map.put(key, unescape(stringVal));
                } else if (primitiveVal != null) {
                    map.put(key, primitiveVal);
                }
            }
            return map;
        }

        private static String unescape(String input) {
            return input.replace("\\\"", "\"")
                        .replace("\\\\", "\\")
                        .replace("\\n", "\n")
                        .replace("\\r", "\r")
                        .replace("\\t", "\t");
        }
    }

    private static void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String responseBody) throws IOException {
        byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static void sendErrorResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "null";
        return "\"" + escapeJsonString(s) + "\"";
    }

    private static String escapeJsonString(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private static String formatNumber(double val) {
        // If it's a whole number, format cleanly or to 2 decimal places
        if (val == Math.floor(val) && !Double.isInfinite(val)) {
            return String.format(Locale.US, "%.1f", val);
        }
        return String.format(Locale.US, "%.2f", val);
    }
}
