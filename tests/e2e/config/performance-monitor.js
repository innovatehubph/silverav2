/**
 * Performance Monitoring Configuration
 * Tracks performance metrics for E2E tests
 */

const fs = require('fs');
const path = require('path');

const PERFORMANCE_BASELINES = {
  'page-load': {
    target: 3000,  // 3 seconds
    warning: 2500, // 2.5 seconds
  },
  'api-response': {
    target: 500,   // 500ms
    warning: 400,  // 400ms
  },
  'cart-update': {
    target: 200,   // 200ms
    warning: 150,  // 150ms
  },
  'navigation': {
    target: 1000,  // 1 second
    warning: 800,  // 800ms
  },
  'form-submission': {
    target: 2000,  // 2 seconds
    warning: 1500, // 1.5 seconds
  },
};

const THRESHOLDS = {
  CRITICAL: 0.90,  // 90%+ of target = critical
  WARNING: 0.75,   // 75%+ of target = warning
  GOOD: 0.50,      // 50%+ of target = good
};

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.results = [];
    this.reportsDir = path.join(__dirname, '../reports/performance');

    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Record a metric
   */
  recordMetric(name, duration, category = 'other') {
    if (!this.metrics[category]) {
      this.metrics[category] = [];
    }

    const baseline = PERFORMANCE_BASELINES[name];
    let status = 'GOOD';
    let percentage = (duration / baseline.target) * 100;

    if (duration > baseline.target) {
      status = 'CRITICAL';
    } else if (duration > baseline.warning) {
      status = 'WARNING';
    }

    const result = {
      name,
      duration,
      baseline: baseline.target,
      percentage,
      status,
      timestamp: new Date().toISOString(),
    };

    this.metrics[category].push(result);
    this.results.push(result);

    return result;
  }

  /**
   * Get average for metric
   */
  getAverageMetric(name) {
    const values = Object.values(this.metrics)
      .flat()
      .filter(m => m.name === name)
      .map(m => m.duration);

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalMetrics: this.results.length,
      summary: this.generateSummary(),
      byCategory: this.metrics,
      detailedResults: this.results,
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  /**
   * Generate summary stats
   */
  generateSummary() {
    const critical = this.results.filter(r => r.status === 'CRITICAL').length;
    const warning = this.results.filter(r => r.status === 'WARNING').length;
    const good = this.results.filter(r => r.status === 'GOOD').length;

    return {
      total: this.results.length,
      critical,
      warning,
      good,
      criticalPercentage: ((critical / this.results.length) * 100).toFixed(2),
      warningPercentage: ((warning / this.results.length) * 100).toFixed(2),
      goodPercentage: ((good / this.results.length) * 100).toFixed(2),
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check for slow page loads
    const slowPageLoads = this.results.filter(
      r => r.name === 'page-load' && r.status === 'CRITICAL'
    );
    if (slowPageLoads.length > 0) {
      recommendations.push({
        severity: 'HIGH',
        metric: 'Page Load Time',
        count: slowPageLoads.length,
        suggestion: 'Optimize bundle size and implement code splitting',
      });
    }

    // Check for slow API responses
    const slowApiCalls = this.results.filter(
      r => r.name === 'api-response' && r.status === 'CRITICAL'
    );
    if (slowApiCalls.length > 0) {
      recommendations.push({
        severity: 'HIGH',
        metric: 'API Response Time',
        count: slowApiCalls.length,
        suggestion: 'Optimize database queries and add caching',
      });
    }

    // Check for slow cart updates
    const slowCartUpdates = this.results.filter(
      r => r.name === 'cart-update' && r.status === 'CRITICAL'
    );
    if (slowCartUpdates.length > 0) {
      recommendations.push({
        severity: 'MEDIUM',
        metric: 'Cart Update Time',
        count: slowCartUpdates.length,
        suggestion: 'Optimize cart API endpoint and UI rendering',
      });
    }

    // Check for slow form submissions
    const slowFormSubmissions = this.results.filter(
      r => r.name === 'form-submission' && r.status === 'CRITICAL'
    );
    if (slowFormSubmissions.length > 0) {
      recommendations.push({
        severity: 'MEDIUM',
        metric: 'Form Submission Time',
        count: slowFormSubmissions.length,
        suggestion: 'Add form validation optimization and debouncing',
      });
    }

    return recommendations;
  }

  /**
   * Save report to file
   */
  saveReport(filename = 'performance-report.json') {
    const report = this.generateReport();
    const filepath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`✅ Performance report saved to ${filepath}`);

    return report;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    const report = this.generateReport();
    const summary = report.summary;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Silvera V2 - Performance Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .metric-card { background: #f9f9f9; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
    .metric-card.critical { border-left-color: #dc3545; }
    .metric-card.warning { border-left-color: #ffc107; }
    .metric-card.good { border-left-color: #28a745; }
    .metric-value { font-size: 28px; font-weight: bold; color: #333; }
    .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
    .recommendations { margin-top: 40px; }
    .recommendation { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
    .recommendation.critical { background: #f8d7da; border-left-color: #dc3545; }
    .recommendation h3 { margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f9f9f9; font-weight: 600; }
    .status-good { color: #28a745; font-weight: 600; }
    .status-warning { color: #ffc107; font-weight: 600; }
    .status-critical { color: #dc3545; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Silvera V2 - Performance Report</h1>
    <div class="meta">
      <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
      <p>Total Metrics Recorded: ${report.totalMetrics}</p>
    </div>

    <div class="summary">
      <div class="metric-card good">
        <div class="metric-value">${summary.good}</div>
        <div class="metric-label">Good (${summary.goodPercentage}%)</div>
      </div>
      <div class="metric-card ${summary.warning > 0 ? 'warning' : ''}">
        <div class="metric-value">${summary.warning}</div>
        <div class="metric-label">Warning (${summary.warningPercentage}%)</div>
      </div>
      <div class="metric-card ${summary.critical > 0 ? 'critical' : ''}">
        <div class="metric-value">${summary.critical}</div>
        <div class="metric-label">Critical (${summary.criticalPercentage}%)</div>
      </div>
    </div>

    <div class="recommendations">
      <h2>📋 Recommendations</h2>
      ${report.recommendations.length > 0 ? report.recommendations.map(r => `
        <div class="recommendation ${r.severity === 'HIGH' ? 'critical' : ''}">
          <h3>${r.metric} (${r.severity} - ${r.count} issues)</h3>
          <p>${r.suggestion}</p>
        </div>
      `).join('') : '<p style="color: #666; margin-top: 10px;">✅ No critical recommendations at this time</p>'}
    </div>

    <div style="margin-top: 40px;">
      <h2>📊 Detailed Metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Duration (ms)</th>
            <th>Baseline (ms)</th>
            <th>% of Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.detailedResults.map(r => `
            <tr>
              <td>${r.name}</td>
              <td>${r.duration}</td>
              <td>${r.baseline}</td>
              <td>${r.percentage.toFixed(2)}%</td>
              <td class="status-${r.status.toLowerCase()}">${r.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
      <p>Performance report for Silvera V2 E2E tests. Generated automatically by performance monitor.</p>
    </footer>
  </div>
</body>
</html>
    `;

    const filepath = path.join(this.reportsDir, 'performance-report.html');
    fs.writeFileSync(filepath, html);
    console.log(`✅ HTML report saved to ${filepath}`);

    return filepath;
  }
}

// Export for use in tests
module.exports = { PerformanceMonitor, PERFORMANCE_BASELINES };

// Example usage if run directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();

  // Simulate some metrics for demo
  monitor.recordMetric('page-load', 2100, 'navigation');
  monitor.recordMetric('page-load', 2850, 'navigation'); // Critical
  monitor.recordMetric('api-response', 450, 'api');
  monitor.recordMetric('cart-update', 180, 'cart');
  monitor.recordMetric('form-submission', 1500, 'forms');
  monitor.recordMetric('form-submission', 2200, 'forms'); // Critical

  // Save reports
  monitor.saveReport();
  monitor.generateHTMLReport();

  // Display summary
  console.log('\n📊 Performance Summary:');
  console.log(JSON.stringify(monitor.generateSummary(), null, 2));
}
