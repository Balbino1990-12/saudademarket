# Reports System - User Guide

Your application has a comprehensive reporting system to track orders, revenue, and customer behavior. Here's how to use it.

## Overview

The Reports system provides:
- **Order Analytics** - View and filter orders by date, status, payment status, category, and seller
- **Revenue Analysis** - Revenue breakdown by product, category, and time trends
- **Customer Insights** - Customer lifetime value and repeat purchase analysis
- **Export Functionality** - Download reports in CSV, Excel, or PDF format
- **Report Scheduling** - Schedule reports to be generated at regular intervals

---

## API Endpoints

All endpoints require **admin session authentication** (add `Authorization` header with your admin token).

### 1. Get Reports Dashboard Data
**GET** `/api/admin/reports`

Returns comprehensive analytics data with the following sections:
- Order list
- Revenue by product
- Revenue by category
- Revenue trends over time
- Customer lifetime value
- Customer repeat purchase summary

**Query Parameters (all optional):**
```
startDate     - Filter by start date (ISO format: 2024-01-15)
endDate       - Filter by end date (ISO format: 2024-12-31)
status        - Filter by order status (pending, completed, cancelled, etc.)
paymentStatus - Filter by payment status (paid, unpaid, refunded, etc.)
categoryId    - Filter by product category ID
sellerId      - Filter by seller ID
limit         - Number of records to return (default: 100)
offset        - Pagination offset (default: 0)
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/reports?startDate=2024-01-01&endDate=2024-12-31&status=completed&limit=50" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "order_serial": "ORD1705449600000",
        "username": "john_doe",
        "email": "john@example.com",
        "status": "completed",
        "payment_status": "paid",
        "total": 150.50,
        "created_at": "2024-01-15T10:30:00Z",
        "item_count": 3
      }
    ],
    "revenueByProduct": [
      {
        "product_id": 5,
        "product_name": "Vinho do Porto",
        "total_revenue": 2500.00,
        "units_sold": 50
      }
    ],
    "revenueByCategory": [
      {
        "category_id": 2,
        "category_name": "Wine",
        "total_revenue": 8500.00,
        "percentage": 45.5
      }
    ],
    "revenueTrend": [
      {
        "date": "2024-01-01",
        "revenue": 500.00,
        "order_count": 5
      }
    ],
    "customerLifetime": {
      "total_customers": 250,
      "avg_lifetime_value": 450.00,
      "highest_ltv_customer": 5000.00
    },
    "repeatSummary": {
      "repeat_customers": 45,
      "repeat_rate": 18.0,
      "avg_repeat_orders": 2.5
    }
  }
}
```

---

### 2. Export Reports
**GET** `/api/admin/reports/export`

Download report data in your preferred format (CSV, Excel, or PDF).

**Query Parameters:**
```
format    - Export format: 'csv' (default), 'excel', or 'pdf'
startDate - Filter by start date
endDate   - Filter by end date
status    - Filter by order status
paymentStatus - Filter by payment status
categoryId - Filter by category
sellerId  - Filter by seller
limit     - Number of records (max 500)
offset    - Pagination offset
```

**Example Requests:**

**Export as CSV:**
```bash
curl -X GET "http://localhost:3000/api/admin/reports/export?format=csv&startDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o orders-report.csv
```

**Export as Excel:**
```bash
curl -X GET "http://localhost:3000/api/admin/reports/export?format=excel&status=completed&limit=200" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o orders-report.xlsx
```

**Export as PDF:**
```bash
curl -X GET "http://localhost:3000/api/admin/reports/export?format=pdf&startDate=2024-06-01&endDate=2024-06-30" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o orders-report.pdf
```

**Export Format Details:**
- **CSV**: Plaintext, compatible with Excel, Google Sheets, and all spreadsheet applications
- **Excel**: XLSX format with formatted columns and widths, easy to further manipulate
- **PDF**: Formatted document (up to 40 records shown), ready to print or share

---

### 3. Schedule Reports
**POST** `/api/admin/reports/schedule`

Automatically generate and send reports at regular intervals.

**Request Body:**
```json
{
  "name": "Monthly Sales Report",
  "frequency": "monthly",
  "format": "excel",
  "filters": {
    "status": "completed",
    "paymentStatus": "paid"
  }
}
```

**Parameters:**
```
name      - Report name (string, required)
frequency - Schedule frequency (string, required):
            - 'daily'
            - 'weekly'
            - 'monthly'
format    - Export format: 'csv', 'excel', 'pdf' (default: 'csv')
filters   - Filters to apply (object, optional):
            - startDate
            - endDate
            - status
            - paymentStatus
            - categoryId
            - sellerId
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/reports/schedule" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Revenue Report",
    "frequency": "weekly",
    "format": "excel",
    "filters": {
      "status": "completed"
    }
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1705449600000,
    "name": "Weekly Revenue Report",
    "frequency": "weekly",
    "format": "excel",
    "filters": {
      "status": "completed"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "lastRun": null
  }
}
```

---

### 4. List Scheduled Reports
**GET** `/api/admin/reports/schedules`

View all scheduled reports and their status.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/reports/schedules" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1705449600000,
      "name": "Weekly Revenue Report",
      "frequency": "weekly",
      "format": "excel",
      "filters": {},
      "createdAt": "2024-01-15T10:30:00Z",
      "lastRun": "2024-01-22T00:00:00Z"
    },
    {
      "id": 1705540000000,
      "name": "Monthly Sales Report",
      "frequency": "monthly",
      "format": "pdf",
      "filters": {
        "status": "completed"
      },
      "createdAt": "2024-01-16T10:30:00Z",
      "lastRun": null
    }
  ]
}
```

---

## Usage Scenarios

### Scenario 1: Check Daily Sales
```bash
# Get today's sales
curl -X GET "http://localhost:3000/api/admin/reports?startDate=2024-01-15&endDate=2024-01-15" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Scenario 2: Monthly Revenue by Category
```bash
# Get all completed, paid orders for January
curl -X GET "http://localhost:3000/api/admin/reports?startDate=2024-01-01&endDate=2024-01-31&status=completed&paymentStatus=paid" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Scenario 3: Export Quarterly Sales Report
```bash
# Export Q1 2024 sales as Excel
curl -X GET "http://localhost:3000/api/admin/reports/export?format=excel&startDate=2024-01-01&endDate=2024-03-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o Q1_2024_Sales.xlsx
```

### Scenario 4: Weekly Automated Reports
```bash
# Schedule weekly Excel reports
curl -X POST "http://localhost:3000/api/admin/reports/schedule" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly All Orders",
    "frequency": "weekly",
    "format": "excel"
  }'
```

### Scenario 5: Track High-Value Customers
```bash
# View customer lifetime value and repeat rates
curl -X GET "http://localhost:3000/api/admin/reports?limit=100" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
# Check the response's customerLifetime and repeatSummary sections
```

---

## Filter Reference

### Status Values
- `pending` - Order awaiting processing
- `completed` - Order fulfilled
- `cancelled` - Order cancelled
- `shipped` - Order shipped
- `delivered` - Order delivered

### Payment Status Values
- `paid` - Payment received
- `unpaid` - Payment pending
- `refunded` - Refund processed
- `partial` - Partial payment received

### Date Format
Use ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`
- Examples: `2024-01-15`, `2024-01-15T10:30:00Z`

### Pagination
- `limit`: Maximum records to return (default 100, max 500 for exports)
- `offset`: Starting position (default 0)
- Example: `limit=50&offset=100` returns records 100-149

---

## Frontend Integration Example

If you have a frontend dashboard, here's how to integrate reports:

```javascript
// Get reports data
async function fetchReports(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/admin/reports?${params}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  return response.json();
}

// Export report
async function exportReport(format = 'csv', filters = {}) {
  const params = new URLSearchParams({ format, ...filters });
  window.location.href = `/api/admin/reports/export?${params}`;
}

// Usage
const reports = await fetchReports({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  status: 'completed'
});

console.log('Orders:', reports.data.orders);
console.log('Revenue by Category:', reports.data.revenueByCategory);
console.log('Customer Repeat Rate:', reports.data.repeatSummary.repeat_rate);
```

---

## Tips & Best Practices

1. **Pagination**: For large date ranges, use `limit` and `offset` to paginate through results
2. **Caching**: Cache report data locally if the same report is requested multiple times
3. **Scheduling**: Set up automated weekly/monthly reports to track trends over time
4. **Exports**: Excel format is best for further analysis; PDF for sharing/archiving
5. **Date Range**: Be specific with date ranges to avoid overwhelming data volumes
6. **Performance**: Narrow filters improve query performance (use status, categoryId when possible)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Authorization header missing" | Ensure you're passing a valid admin token in the Authorization header |
| Empty results | Check date range and filter values match your actual data |
| Export file is empty | Increase the `limit` parameter (default 100) |
| PDF shows "Showing X of Y results" | The PDF format displays up to 40 records; use Excel for more |
| "startDate must be earlier than endDate" | Swap your start and end dates |

---

## Questions?

For more help:
- Check the Order model for additional database fields you can filter by
- Review the admin routes in `src/routes/admin.js`
- Check logs in your server terminal for detailed error messages
