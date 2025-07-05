/**
 * Performance Testing for Cloud vs Server/DC
 * 
 * This script tests and compares performance between Cloud and Server/DC deployments.
 */

interface PerformanceMetrics {
  responseTime: number;
  success: boolean;
  statusCode?: number;
  error?: string;
  deployment: 'cloud' | 'server';
  endpoint: string;
}

interface PerformanceReport {
  deployment: 'cloud' | 'server';
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  errorCount: number;
}

/**
 * Test a single endpoint performance
 */
async function testEndpointPerformance(
  baseUrl: string,
  endpoint: string,
  headers: Record<string, string>,
  deployment: 'cloud' | 'server'
): Promise<PerformanceMetrics> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
      credentials: 'omit'
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return {
      responseTime,
      success: response.ok,
      statusCode: response.status,
      deployment,
      endpoint
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return {
      responseTime,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      deployment,
      endpoint
    };
  }
}

/**
 * Test multiple endpoints for performance comparison
 */
async function testMultipleEndpoints(
  baseUrl: string,
  headers: Record<string, string>,
  deployment: 'cloud' | 'server',
  iterations: number = 5
): Promise<PerformanceMetrics[]> {
  const endpoints = [
    '/rest/api/2/myself',
    '/rest/api/2/project',
    '/rest/api/2/issue/search?jql=assignee=currentUser()&maxResults=10',
    '/rest/api/2/serverInfo'
  ];
  
  const results: PerformanceMetrics[] = [];
  
  console.log(`\n🔄 Testing ${deployment.toUpperCase()} performance (${iterations} iterations per endpoint)`);
  
  for (const endpoint of endpoints) {
    console.log(`   Testing: ${endpoint}`);
    
    for (let i = 0; i < iterations; i++) {
      const result = await testEndpointPerformance(baseUrl, endpoint, headers, deployment);
      results.push(result);
      
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Generate performance report
 */
function generatePerformanceReport(metrics: PerformanceMetrics[]): PerformanceReport {
  const successfulMetrics = metrics.filter(m => m.success);
  const responseTimes = successfulMetrics.map(m => m.responseTime);
  
  return {
    deployment: metrics[0]?.deployment || 'unknown' as any,
    totalRequests: metrics.length,
    successfulRequests: successfulMetrics.length,
    averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    successRate: (successfulMetrics.length / metrics.length) * 100,
    errorCount: metrics.length - successfulMetrics.length
  };
}

/**
 * Compare performance between deployments
 */
function comparePerformance(cloudReport: PerformanceReport, serverReport: PerformanceReport): string {
  let comparison = '\n📊 Performance Comparison\n';
  comparison += '=' .repeat(50) + '\n\n';
  
  comparison += `📈 Response Times (ms):\n`;
  comparison += `   Cloud Average:  ${cloudReport.averageResponseTime.toFixed(2)}ms\n`;
  comparison += `   Server Average: ${serverReport.averageResponseTime.toFixed(2)}ms\n`;
  
  const timeDiff = Math.abs(cloudReport.averageResponseTime - serverReport.averageResponseTime);
  const fasterDeployment = cloudReport.averageResponseTime < serverReport.averageResponseTime ? 'Cloud' : 'Server';
  comparison += `   Winner: ${fasterDeployment} (${timeDiff.toFixed(2)}ms faster)\n\n`;
  
  comparison += `🎯 Success Rates:\n`;
  comparison += `   Cloud:  ${cloudReport.successRate.toFixed(1)}% (${cloudReport.successfulRequests}/${cloudReport.totalRequests})\n`;
  comparison += `   Server: ${serverReport.successRate.toFixed(1)}% (${serverReport.successfulRequests}/${serverReport.totalRequests})\n\n`;
  
  comparison += `⚡ Response Time Ranges:\n`;
  comparison += `   Cloud:  ${cloudReport.minResponseTime.toFixed(2)}ms - ${cloudReport.maxResponseTime.toFixed(2)}ms\n`;
  comparison += `   Server: ${serverReport.minResponseTime.toFixed(2)}ms - ${serverReport.maxResponseTime.toFixed(2)}ms\n\n`;
  
  comparison += `❌ Error Counts:\n`;
  comparison += `   Cloud:  ${cloudReport.errorCount} errors\n`;
  comparison += `   Server: ${serverReport.errorCount} errors\n`;
  
  return comparison;
}

/**
 * Test authentication performance specifically
 */
async function testAuthPerformance(
  baseUrl: string,
  headers: Record<string, string>,
  deployment: 'cloud' | 'server',
  iterations: number = 10
): Promise<PerformanceMetrics[]> {
  console.log(`\n🔐 Testing authentication performance for ${deployment.toUpperCase()}`);
  
  const results: PerformanceMetrics[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await testEndpointPerformance(baseUrl, '/rest/api/2/myself', headers, deployment);
    results.push(result);
    
    if (i % 3 === 0) {
      process.stdout.write('.');
    }
    
    // Small delay between auth requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(' Done!');
  return results;
}

/**
 * Main performance testing function
 */
async function runPerformanceTests() {
  console.log('⚡ Performance Testing Suite');
  console.log('=' .repeat(60));
  
  // Test configurations
  const cloudConfig = {
    baseUrl: process.env.ATLASSIAN_SITE_NAME || 'https://company.atlassian.net',
    email: process.env.ATLASSIAN_USER_EMAIL || 'user@company.com',
    apiToken: process.env.ATLASSIAN_API_TOKEN || 'cloud_token'
  };
  
  const serverConfig = {
    baseUrl: process.env.ATLASSIAN_SERVER_URL || 'https://jira.company.com',
    email: process.env.ATLASSIAN_USER_EMAIL || 'admin',
    apiToken: process.env.ATLASSIAN_PAT_TOKEN || process.env.ATLASSIAN_API_TOKEN || 'server_token'
  };
  
  // Create auth headers
  const cloudHeaders = {
    'Authorization': `Basic ${Buffer.from(`${cloudConfig.email}:${cloudConfig.apiToken}`).toString('base64')}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'MCP-Atlassian-Server-Performance-Test/2.1.1'
  };
  
  const serverHeaders = {
    'Authorization': `Basic ${Buffer.from(`${serverConfig.email}:${serverConfig.apiToken}`).toString('base64')}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'MCP-Atlassian-Server-Performance-Test/2.1.1'
  };
  
  console.log('\n🔧 Configuration:');
  console.log(`   Cloud URL:  ${cloudConfig.baseUrl}`);
  console.log(`   Server URL: ${serverConfig.baseUrl}`);
  console.log(`   Test User:  ${cloudConfig.email}`);
  
  // Check if we have real credentials
  const hasRealCredentials = process.env.ATLASSIAN_SITE_NAME && 
                            process.env.ATLASSIAN_USER_EMAIL && 
                            process.env.ATLASSIAN_API_TOKEN;
  
  if (!hasRealCredentials) {
    console.log('\n⚠️  No real credentials detected. Using mock performance testing.');
    console.log('   Set ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, ATLASSIAN_API_TOKEN for real testing.');
    
    // Mock performance data for demonstration
    const mockCloudMetrics: PerformanceMetrics[] = Array.from({ length: 20 }, (_, i) => ({
      responseTime: 150 + Math.random() * 100,
      success: Math.random() > 0.1,
      statusCode: Math.random() > 0.1 ? 200 : 401,
      deployment: 'cloud',
      endpoint: `/rest/api/2/mock-${i}`
    }));
    
    const mockServerMetrics: PerformanceMetrics[] = Array.from({ length: 20 }, (_, i) => ({
      responseTime: 200 + Math.random() * 150,
      success: Math.random() > 0.15,
      statusCode: Math.random() > 0.15 ? 200 : 500,
      deployment: 'server',
      endpoint: `/rest/api/2/mock-${i}`
    }));
    
    const cloudReport = generatePerformanceReport(mockCloudMetrics);
    const serverReport = generatePerformanceReport(mockServerMetrics);
    
    console.log('\n📊 Mock Performance Results:');
    console.log(`   Cloud:  ${cloudReport.averageResponseTime.toFixed(2)}ms avg, ${cloudReport.successRate.toFixed(1)}% success`);
    console.log(`   Server: ${serverReport.averageResponseTime.toFixed(2)}ms avg, ${serverReport.successRate.toFixed(1)}% success`);
    
    console.log(comparePerformance(cloudReport, serverReport));
    
    return { cloudReport, serverReport };
  }
  
  try {
    // Test authentication performance
    const cloudAuthMetrics = await testAuthPerformance(cloudConfig.baseUrl, cloudHeaders, 'cloud', 10);
    const serverAuthMetrics = await testAuthPerformance(serverConfig.baseUrl, serverHeaders, 'server', 10);
    
    // Test multiple endpoints
    const cloudMetrics = await testMultipleEndpoints(cloudConfig.baseUrl, cloudHeaders, 'cloud', 3);
    const serverMetrics = await testMultipleEndpoints(serverConfig.baseUrl, serverHeaders, 'server', 3);
    
    // Generate reports
    const cloudReport = generatePerformanceReport([...cloudAuthMetrics, ...cloudMetrics]);
    const serverReport = generatePerformanceReport([...serverAuthMetrics, ...serverMetrics]);
    
    console.log('\n📊 Performance Results:');
    console.log(`   Cloud:  ${cloudReport.averageResponseTime.toFixed(2)}ms avg, ${cloudReport.successRate.toFixed(1)}% success`);
    console.log(`   Server: ${serverReport.averageResponseTime.toFixed(2)}ms avg, ${serverReport.successRate.toFixed(1)}% success`);
    
    console.log(comparePerformance(cloudReport, serverReport));
    
    return { cloudReport, serverReport };
    
  } catch (error) {
    console.error('💥 Performance testing failed:', error);
    throw error;
  }
}

/**
 * Test specific deployment performance
 */
async function testSingleDeployment(
  baseUrl: string,
  email: string,
  apiToken: string,
  deployment: 'cloud' | 'server'
) {
  const headers = {
    'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'MCP-Atlassian-Server-Performance-Test/2.1.1'
  };
  
  console.log(`\n🎯 Testing ${deployment.toUpperCase()} deployment: ${baseUrl}`);
  
  const metrics = await testMultipleEndpoints(baseUrl, headers, deployment, 5);
  const report = generatePerformanceReport(metrics);
  
  console.log(`\n📊 ${deployment.toUpperCase()} Results:`);
  console.log(`   Total Requests: ${report.totalRequests}`);
  console.log(`   Success Rate: ${report.successRate.toFixed(1)}%`);
  console.log(`   Average Response Time: ${report.averageResponseTime.toFixed(2)}ms`);
  console.log(`   Min/Max Response Time: ${report.minResponseTime.toFixed(2)}ms / ${report.maxResponseTime.toFixed(2)}ms`);
  console.log(`   Errors: ${report.errorCount}`);
  
  return report;
}

// Main execution
async function main() {
  console.log('🚀 MCP Atlassian Server - Performance Testing');
  console.log('=' .repeat(60));
  
  try {
    await runPerformanceTests();
    
    console.log('\n💡 Performance Testing Tips:');
    console.log('   - Network latency significantly affects Server/DC performance');
    console.log('   - Cloud APIs are generally more consistent in response times');
    console.log('   - Server/DC performance depends on hardware and network setup');
    console.log('   - Authentication caching can improve performance');
    console.log('   - Use connection pooling for better performance');
    
  } catch (error) {
    console.error('💥 Performance testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  testEndpointPerformance,
  testMultipleEndpoints,
  generatePerformanceReport,
  comparePerformance,
  testAuthPerformance,
  runPerformanceTests,
  testSingleDeployment
}; 