/**
 * Validation Scripts for Phase 6 Testing
 * 
 * Simple validation scripts that test deployment detection and authentication
 * without complex imports from the main package.
 */

interface TestConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

interface ValidationResult {
  success: boolean;
  deploymentType: 'cloud' | 'server';
  message: string;
  details?: any;
}

/**
 * Simple deployment type detection based on URL patterns
 */
function detectDeploymentType(url: string): 'cloud' | 'server' {
  if (!url) return 'server';
  
  try {
    const hostname = new URL(url).hostname;
    
    // Check for localhost/private IPs (always Server/DC)
    if (hostname === 'localhost' || 
        hostname.match(/^127\./) ||
        hostname.match(/^192\.168\./) ||
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return 'server';
    }
    
    // Check for Atlassian Cloud domains
    if (hostname.includes('.atlassian.net') ||
        hostname.includes('.jira.com') ||
        hostname.includes('api.atlassian.com')) {
      return 'cloud';
    }
    
    return 'server';
  } catch (error) {
    return 'server';
  }
}

/**
 * Validate configuration structure
 */
function validateConfiguration(config: TestConfig): ValidationResult {
  const deploymentType = detectDeploymentType(config.baseUrl);
  
  // Validate base URL
  try {
    new URL(config.baseUrl);
  } catch (error) {
    return {
      success: false,
      deploymentType,
      message: 'Invalid base URL format'
    };
  }
  
  // Validate credentials based on deployment type
  if (deploymentType === 'cloud') {
    if (!config.email || !config.apiToken) {
      return {
        success: false,
        deploymentType,
        message: 'Cloud deployment requires email and API token'
      };
    }
    
    if (!config.email.includes('@')) {
      return {
        success: false,
        deploymentType,
        message: 'Invalid email format for Cloud deployment'
      };
    }
  } else {
    // Server/DC
    if (!config.email || !config.apiToken) {
      return {
        success: false,
        deploymentType,
        message: 'Server/DC deployment requires email and API token (or username+password)'
      };
    }
  }
  
  return {
    success: true,
    deploymentType,
    message: `Valid ${deploymentType} configuration`
  };
}

/**
 * Test authentication by calling the myself endpoint
 */
async function testAuthentication(config: TestConfig): Promise<ValidationResult> {
  const validation = validateConfiguration(config);
  if (!validation.success) {
    return validation;
  }
  
  try {
    // Build the myself endpoint URL
    const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
    const myselfUrl = `${baseUrl}/rest/api/2/myself`;
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server-Test/2.1.1'
    };
    
    console.log(`🔍 Testing authentication: ${myselfUrl}`);
    console.log(`   Deployment: ${validation.deploymentType.toUpperCase()}`);
    console.log(`   User: ${config.email}`);
    
    const response = await fetch(myselfUrl, {
      method: 'GET',
      headers,
      credentials: 'omit'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        deploymentType: validation.deploymentType,
        message: `Authentication failed: HTTP ${response.status} - ${response.statusText}`,
        details: { statusCode: response.status, error: errorText }
      };
    }
    
    const userData = await response.json();
    
    return {
      success: true,
      deploymentType: validation.deploymentType,
      message: `Authentication successful for ${userData.displayName || userData.name}`,
      details: {
        user: {
          accountId: userData.accountId,
          username: userData.name || userData.username,
          displayName: userData.displayName,
          emailAddress: userData.emailAddress,
          active: userData.active !== false
        }
      }
    };
    
  } catch (error) {
    return {
      success: false,
      deploymentType: validation.deploymentType,
      message: `Authentication test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Run validation tests for different scenarios
 */
async function runValidationTests() {
  console.log('🧪 Phase 6 Validation Tests');
  console.log('=' .repeat(50));
  
  // Test configurations
  const testConfigs: { name: string; config: TestConfig }[] = [
    {
      name: 'Cloud Example',
      config: {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'cloud_api_token'
      }
    },
    {
      name: 'Server Example',
      config: {
        baseUrl: 'https://jira.company.com',
        email: 'admin',
        apiToken: 'server_token'
      }
    },
    {
      name: 'Localhost Example',
      config: {
        baseUrl: 'http://localhost:8080',
        email: 'admin',
        apiToken: 'admin'
      }
    },
    {
      name: 'Environment Variables',
      config: {
        baseUrl: process.env.ATLASSIAN_SITE_NAME || 'https://example.atlassian.net',
        email: process.env.ATLASSIAN_USER_EMAIL || 'test@example.com',
        apiToken: process.env.ATLASSIAN_API_TOKEN || 'test_token'
      }
    }
  ];
  
  const results = [];
  
  for (const { name, config } of testConfigs) {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   URL: ${config.baseUrl}`);
    console.log(`   Email: ${config.email}`);
    console.log(`   Token: ${config.apiToken.substring(0, 5)}...`);
    
    // Test configuration validation
    const validation = validateConfiguration(config);
    console.log(`   Config: ${validation.success ? '✅' : '❌'} ${validation.message}`);
    
    if (validation.success) {
      // Test authentication (only if env vars are set for real testing)
      if (name === 'Environment Variables' && 
          process.env.ATLASSIAN_SITE_NAME && 
          process.env.ATLASSIAN_USER_EMAIL && 
          process.env.ATLASSIAN_API_TOKEN) {
        
        console.log('   🔐 Testing real authentication...');
        const authResult = await testAuthentication(config);
        console.log(`   Auth: ${authResult.success ? '✅' : '❌'} ${authResult.message}`);
        
        if (authResult.success && authResult.details) {
          console.log(`   👤 User: ${authResult.details.user.displayName || authResult.details.user.username}`);
        }
        
        results.push(authResult);
      } else {
        console.log('   🔐 Skipping auth test (no real credentials)');
      }
    }
    
    results.push(validation);
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(30));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  console.log(`📈 Success Rate: ${Math.round((successful / total) * 100)}%`);
  
  if (successful === total) {
    console.log('\n🎉 All validation tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check configuration and credentials.');
  }
  
  return results;
}

/**
 * Test deployment detection specifically
 */
function testDeploymentDetection() {
  console.log('\n🏗️  Testing Deployment Detection');
  console.log('=' .repeat(40));
  
  const testUrls = [
    'https://company.atlassian.net',
    'https://company.atlassian.net/jira',
    'https://jira.company.com',
    'https://confluence.company.com',
    'http://localhost:8080',
    'https://192.168.1.100:8080',
    'https://10.0.0.1',
    'https://jira.internal.company.com'
  ];
  
  testUrls.forEach(url => {
    const deploymentType = detectDeploymentType(url);
    console.log(`   ${url} → ${deploymentType.toUpperCase()}`);
  });
}

// Main execution
async function main() {
  console.log('🚀 MCP Atlassian Server - Phase 6 Validation');
  console.log('=' .repeat(60));
  
  try {
    // Test deployment detection
    testDeploymentDetection();
    
    // Run validation tests
    await runValidationTests();
    
    console.log('\n💡 Tips for Phase 6 Testing:');
    console.log('   - Set environment variables to test with real instances');
    console.log('   - Use ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, ATLASSIAN_API_TOKEN');
    console.log('   - For Server/DC, use ATLASSIAN_PAT_TOKEN if available');
    console.log('   - Check network connectivity for on-premise instances');
    
  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  detectDeploymentType,
  validateConfiguration,
  testAuthentication,
  runValidationTests,
  testDeploymentDetection
}; 