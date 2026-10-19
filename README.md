# ⚡ Electricity Bill Estimator

> **College Java Micro-Project**  
> A complete, modern, responsive web application for progressive electricity consumption calculation and receipt generation, powered by a pure **Core Java HTTP Server** backend (without Spring Boot or external libraries).

---

## 📌 Project Overview

**Electricity Bill Estimator** is an academic micro-project engineered for college students and instructors. It demonstrates how a modern, responsive web client (HTML5, CSS3, JavaScript) interacts with a lightweight REST API built with Core Java's built-in `com.sun.net.httpserver.HttpServer`.

### Key Highlights
- **100% Core Java Backend**: Zero external dependencies (no Maven, Gradle, Spring Boot, Jackson, or Gson required).
- **Single-Origin Deployment**: The Java server hosts both the static frontend assets (`index.html`, `style.css`, `script.js`) and the REST API (`/api/calculate`, `/api/health`) on port `8080`.
- **Progressive Slab Billing**: Accurate stepped consumption pricing with dynamic visual distribution.
- **Dual-Layer Validation**: Client-side feedback + strict server-side validation with standard HTTP error codes (`400 Bad Request`, `405 Method Not Allowed`, `500 Internal Server Error`).
- **Official Printable Receipt**: Generates a professional electricity utility bill that can be printed or saved as a PDF using browser printing (`window.print()`).
- **Quick Test Presets**: 1-click test buttons to demonstrate all grading test cases in college reviews.

---

## 📁 Project Structure

```
ElectricityBillEstimator/
├── index.html                  # Semantic HTML5 user interface & receipt modal
├── style.css                   # Responsive CSS3 styling & @media print stylesheet
├── script.js                   # Client-side validation, REST fetch & UI handlers
├── ElectricityBillServer.java  # Core Java HTTP server, API endpoints & tariff logic
├── start.bat                   # One-click Windows launch script
└── README.md                   # Complete documentation & viva review guide
```

---

## ⚙️ Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend UI** | HTML5, CSS3 (Flexbox/Grid), Vanilla JS | Fast, responsive, clean white/green design, no bulky frameworks |
| **Backend Server** | Core Java (`com.sun.net.httpserver`) | Built-in to JDK; simple and beginner-friendly for college reviews |
| **Communication** | HTTP REST (JSON / UTF-8) | Standard JSON `POST` request and response architecture |
| **Dependencies** | **None (Pure Java Standard Library)** | No external JARs, npm, Node.js, or Live Server needed |

---

## 💡 Progressive Tariff Slab Formula

The system calculates units consumed using:
$$\text{Units Consumed} = \text{Current Meter Reading} - \text{Previous Meter Reading}$$

Energy charges are calculated progressively across sample demonstration slabs:

| Slab Tier | Consumption Range | Rate per Unit | Formula for Slab |
|---|---|---|---|
| **Slab 1** | First 100 units (1 – 100) | **₹2.00** | $\min(\text{Units}, 100) \times ₹2$ |
| **Slab 2** | Next 100 units (101 – 200) | **₹3.00** | $\min(\max(\text{Units} - 100, 0), 100) \times ₹3$ |
| **Slab 3** | Units above 200 (> 200) | **₹5.00** | $\max(\text{Units} - 200, 0) \times ₹5$ |

*Disclaimer: These rates are sample demonstration slabs for an academic project and do not reflect official government utility tariffs.*

---

## 🧪 Verified Test Cases (Grading Scenarios)

| Test Case | Previous Reading | Current Reading | Units Consumed | Tariff Breakdown | Total Bill |
|---|---|---|---|---|---|
| **Test 1** | 1000 | 1050 | **50 units** | 50 units × ₹2 | **₹100.00** |
| **Test 2** | 1000 | 1100 | **100 units** | 100 units × ₹2 | **₹200.00** |
| **Test 3** | 1000 | 1150 | **150 units** | (100 × ₹2) + (50 × ₹3) = 200 + 150 | **₹350.00** |
| **Test 4** | 1000 | 1200 | **200 units** | (100 × ₹2) + (100 × ₹3) = 200 + 300 | **₹500.00** |
| **Test 5** | 1000 | 1250 | **250 units** | (100 × ₹2) + (100 × ₹3) + (50 × ₹5) = 200 + 300 + 250 | **₹750.00** |

### Input Validation Test Cases:
- **Current Reading < Previous Reading**: Rejected with HTTP `400 Bad Request` ("*Current reading (X) cannot be less than previous reading (Y)*").
- **Negative Reading**: Rejected with HTTP `400 Bad Request` ("*Reading cannot be negative*").
- **Empty Consumer Name**: Rejected with HTTP `400 Bad Request` ("*Consumer name is required*").
- **Non-Numeric Characters**: Rejected with HTTP `400 Bad Request` ("*Meter readings must be valid numeric values*").

---

## 🚀 Running Instructions

### Option 1: One-Click Launch (Windows)
Double-click `start.bat` in the project folder. It will:
1. Compile `ElectricityBillServer.java`.
2. Start the Java HTTP server.
3. Automatically launch your default web browser to `http://localhost:8080`.

---

### Option 2: Running via Command Prompt / PowerShell

1. Open a terminal (PowerShell, Command Prompt, or VS Code terminal) in the project folder:
   ```powershell
   cd c:\Users\hnagireddy\Desktop\java
   ```

2. Compile the Java server:
   ```cmd
   javac ElectricityBillServer.java
   ```

3. Run the Java server:
   ```cmd
   java ElectricityBillServer
   ```

4. You will see the server startup banner:
   ```text
   ===============================================================
      ⚡ ELECTRICITY BILL ESTIMATOR - JAVA BACKEND SERVER ⚡    
   ===============================================================
      Status   : Server successfully started!
      Address  : http://localhost:8080/
      API Docs : POST http://localhost:8080/api/calculate
      Health   : GET  http://localhost:8080/api/health
   ===============================================================
   ```

5. Open your web browser and navigate to:
   ```
   http://localhost:8080
   ```

---

### Option 3: Running in Visual Studio Code

1. Open the project folder in VS Code (`File` &rarr; `Open Folder...` &rarr; select folder).
2. Open the built-in terminal (`Ctrl` + `` ` ``).
3. Type:
   ```cmd
   javac ElectricityBillServer.java
   java ElectricityBillServer
   ```
4. Hold `Ctrl` and click the link `http://localhost:8080` in the terminal to open the web application.

---

## 🔌 REST API Specification

### 1. Calculate Bill Endpoint
- **URL**: `/api/calculate`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

**Sample Request Body:**
```json
{
  "consumerName": "Rahul Sharma",
  "consumerNumber": "CON-88421",
  "billingPeriod": "October 2026",
  "previousReading": 1000.0,
  "currentReading": 1250.0
}
```

**Sample Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Bill calculated successfully",
  "data": {
    "billId": "BILL-20261018-1001",
    "generatedAt": "2026-10-18 21:05:00",
    "consumerName": "Rahul Sharma",
    "consumerNumber": "CON-88421",
    "billingPeriod": "October 2026",
    "previousReading": 1000.0,
    "currentReading": 1250.0,
    "unitsConsumed": 250.0,
    "totalEnergyCharge": 750.0,
    "totalBill": 750.0,
    "currency": "INR",
    "currencySymbol": "₹",
    "slabs": [
      {
        "slabName": "Slab 1 (First 100 units)",
        "range": "0 - 100 units",
        "rate": 2.0,
        "units": 100.0,
        "amount": 200.0
      },
      {
        "slabName": "Slab 2 (Next 100 units)",
        "range": "101 - 200 units",
        "rate": 3.0,
        "units": 100.0,
        "amount": 300.0
      },
      {
        "slabName": "Slab 3 (Above 200 units)",
        "range": "> 200 units",
        "rate": 5.0,
        "units": 50.0,
        "amount": 250.0
      }
    ]
  }
}
```

**Error Response (`400 Bad Request`):**
```json
{
  "success": false,
  "message": "Current reading (950.0) cannot be less than previous reading (1000.0)."
}
```

### 2. Health Check Endpoint
- **URL**: `/api/health`
- **Method**: `GET`
- **Response**:
```json
{
  "status": "UP",
  "server": "Core Java HttpServer (com.sun.net.httpserver)",
  "timestamp": "2026-10-18 21:05:00"
}
```

---

## 🖨️ Printable Receipt Feature

1. Once a bill is calculated, click **"View & Print Official Receipt"** or **"Quick Print"**.
2. A formal receipt card is presented with:
   - Organization name ("City Electricity Distribution Board")
   - Unique Bill ID and date
   - Consumer credentials & meter number
   - Meter reading subtraction box
   - Itemized tariff slab table
   - Total amount payable
   - Official academic disclaimer and signature line
3. The receipt can be printed onto paper or saved as a clean PDF (`window.print()`).
4. Custom `@media print` CSS rules automatically hide the navigation bar, input form, buttons, and backgrounds, ensuring an uncluttered, high-contrast, professional document.

---

## 🎓 College Viva Voce / Project Review Q&A

**Q1: Why did you use `com.sun.net.httpserver.HttpServer` instead of Spring Boot or Servlets?**  
> *Answer:* `com.sun.net.httpserver.HttpServer` is built directly into Java Standard Edition (JDK). It allows us to understand raw HTTP mechanics—handling contexts, reading request input streams, managing response codes, setting MIME types, and handling CORS headers—without the heavy abstraction, autoconfiguration, and memory overhead of Spring Boot.

**Q2: How does the progressive tariff calculation work?**  
> *Answer:* Unlike flat-rate billing where all units are multiplied by a single price, progressive billing splits total consumption into tiered slabs. If a customer consumes 250 units:  
> - The first 100 units are billed at Slab 1 (₹2/unit = ₹200).  
> - The next 100 units (101 to 200) are billed at Slab 2 (₹3/unit = ₹300).  
> - The remaining 50 units (above 200) are billed at Slab 3 (₹5/unit = ₹250).  
> The total bill is the sum of all slab charges: $200 + 300 + 250 = ₹750$.

**Q3: How is JSON parsed without third-party libraries like Jackson or Gson?**  
> *Answer:* We implemented `SimpleJsonParser`, a clean, regular-expression-based token parser in Java. It matches JSON `"key" : "value"` and `"key" : number` pairs from the UTF-8 input stream and unescapes string characters, creating an associative key-value map purely with the `java.util.regex` package.

**Q4: How does the server serve HTML, CSS, and JS files?**  
> *Answer:* A root context handler (`StaticFileHandler`) captures GET requests for `/`, `/style.css`, and `/script.js`. It maps the request path to a local file, resolves its MIME type (e.g., `text/html`, `text/css`, `application/javascript`), and streams the raw bytes to `exchange.getResponseBody()`.

**Q5: What is CORS and how does this application handle it?**  
> *Answer:* Cross-Origin Resource Sharing (CORS) is a browser security mechanism that restricts HTTP requests made across different domains or ports. The Java server sends `Access-Control-Allow-Origin: *` and handles HTTP `OPTIONS` preflight requests, allowing the frontend to connect seamlessly whether opened directly from the Java server or another origin.

---

## 👨‍💻 Developer & Project Credits
- **Project Title**: Electricity Bill Estimator
- **Subject**: Java Programming Micro-Project
- **Architecture**: Core Java HTTP REST Micro-Service + Responsive Web Frontend
