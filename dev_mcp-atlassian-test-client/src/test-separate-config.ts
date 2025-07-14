#!/usr/bin/env node

/**
 * Test script for separate Jira and Confluence configurations
 * This script validates that the server can handle separate configurations correctly
 */

import { Config } from '../../src/utils/mcp-helpers.js';

console.log('🧪 Testing Separate Configuration Support');
console.log('========================================');

// Test 1: Test separate configuration functions
console.log('\n1. Testing separate configuration functions...');

try {
  // Test Jira configuration
  console.log('   Testing Jira configuration...');
  const jiraConfig = Config.getJiraConfigFromEnv();
  if (jiraConfig) {
    console.log(`   ✅ Jira config loaded: ${jiraConfig.baseUrl} (${jiraConfig.deploymentType})`);
  } else {
    console.log('   ⚠️  No Jira configuration found');
  }

  // Test Confluence configuration
  console.log('   Testing Confluence configuration...');
  const confluenceConfig = Config.getConfluenceConfigFromEnv();
  if (confluenceConfig) {
    console.log(`   ✅ Confluence config loaded: ${confluenceConfig.baseUrl} (${confluenceConfig.deploymentType})`);
  } else {
    console.log('   ⚠️  No Confluence configuration found');
  }

  // Test combined configuration
  console.log('   Testing combined configuration...');
  const separateConfigs = Config.getSeparateConfigsFromEnv();
  console.log(`   📊 Configuration summary:`);
  console.log(`      - Jira: ${separateConfigs.jira ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`      - Confluence: ${separateConfigs.confluence ? '✅ Configured' : '❌ Not configured'}`);

} catch (error) {
  console.error('   ❌ Error testing configuration:', error);
}

// Test 2: Test environment variable patterns
console.log('\n2. Testing environment variable patterns...');

const envVars = {
  'JIRA_URL': process.env.JIRA_URL,
  'JIRA_PAT_TOKEN': process.env.JIRA_PAT_TOKEN ? '***' : undefined,
  'JIRA_USER_EMAIL': process.env.JIRA_USER_EMAIL,
  'JIRA_API_TOKEN': process.env.JIRA_API_TOKEN ? '***' : undefined,
  'CONFLUENCE_URL': process.env.CONFLUENCE_URL,
  'CONFLUENCE_PAT_TOKEN': process.env.CONFLUENCE_PAT_TOKEN ? '***' : undefined,
  'CONFLUENCE_USER_EMAIL': process.env.CONFLUENCE_USER_EMAIL,
  'CONFLUENCE_API_TOKEN': process.env.CONFLUENCE_API_TOKEN ? '***' : undefined,
  'ATLASSIAN_SITE_NAME': process.env.ATLASSIAN_SITE_NAME,
  'ATLASSIAN_PAT_TOKEN': process.env.ATLASSIAN_PAT_TOKEN ? '***' : undefined,
  'ATLASSIAN_USER_EMAIL': process.env.ATLASSIAN_USER_EMAIL,
  'ATLASSIAN_API_TOKEN': process.env.ATLASSIAN_API_TOKEN ? '***' : undefined,
};

console.log('   Environment variables detected:');
Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    console.log(`   ${key}: ${value}`);
  }
});

// Test 3: Test configuration priority
console.log('\n3. Testing configuration priority...');

try {
  // Test fallback behavior
  console.log('   Testing fallback behavior...');
  
  // Mock context for testing
  const mockContext = {
    jiraConfig: null,
    confluenceConfig: null
  };

  // Test Jira config priority
  const jiraConfigTest = Config.getJiraConfigFromContextOrEnv(mockContext);
  if (jiraConfigTest) {
    console.log(`   ✅ Jira config priority test passed: ${jiraConfigTest.baseUrl}`);
  } else {
    console.log('   ⚠️  No Jira config available for priority test');
  }

  // Test Confluence config priority
  const confluenceConfigTest = Config.getConfluenceConfigFromContextOrEnv(mockContext);
  if (confluenceConfigTest) {
    console.log(`   ✅ Confluence config priority test passed: ${confluenceConfigTest.baseUrl}`);
  } else {
    console.log('   ⚠️  No Confluence config available for priority test');
  }

} catch (error) {
  console.error('   ❌ Error testing configuration priority:', error);
}

// Test 4: Test configuration validation
console.log('\n4. Testing configuration validation...');

try {
  const separateConfigs = Config.getSeparateConfigsFromEnv();
  
  if (separateConfigs.jira) {
    const validation = Config.validateConfig(separateConfigs.jira);
    console.log(`   Jira config validation: ${validation.isValid ? '✅ Valid' : '❌ Invalid - ' + validation.error}`);
  }

  if (separateConfigs.confluence) {
    const validation = Config.validateConfig(separateConfigs.confluence);
    console.log(`   Confluence config validation: ${validation.isValid ? '✅ Valid' : '❌ Invalid - ' + validation.error}`);
  }

} catch (error) {
  console.error('   ❌ Error testing configuration validation:', error);
}

// Test 5: Test backward compatibility
console.log('\n5. Testing backward compatibility...');

try {
  console.log('   Testing legacy configuration fallback...');
  
  // Test if legacy config still works
  try {
    const legacyConfig = Config.getAtlassianConfigFromEnv();
    console.log(`   ✅ Legacy config still works: ${legacyConfig.baseUrl} (${legacyConfig.deploymentType})`);
  } catch (error) {
    console.log('   ⚠️  Legacy config not available (this is expected if using separate configs)');
  }

} catch (error) {
  console.error('   ❌ Error testing backward compatibility:', error);
}

console.log('\n📋 Configuration Summary:');
console.log('========================');

const summary = Config.getSeparateConfigsFromEnv();
if (summary.jira || summary.confluence) {
  console.log('✅ Separate configuration mode detected');
  
  if (summary.jira) {
    console.log(`   🔧 Jira: ${summary.jira.baseUrl} (${summary.jira.deploymentType})`);
    console.log(`       Auth: ${summary.jira.email ? 'Basic Auth' : 'PAT Token'}`);
  }
  
  if (summary.confluence) {
    console.log(`   📝 Confluence: ${summary.confluence.baseUrl} (${summary.confluence.deploymentType})`);
    console.log(`       Auth: ${summary.confluence.email ? 'Basic Auth' : 'PAT Token'}`);
  }
} else {
  console.log('⚠️  No separate configurations found');
  console.log('   This might be using legacy single configuration or no configuration at all');
}

console.log('\n🎉 Separate configuration test completed!');
console.log('');
console.log('💡 To test with actual configurations, set environment variables:');
console.log('   JIRA_URL=https://jira.company.com');
console.log('   JIRA_PAT_TOKEN=your-jira-token');
console.log('   CONFLUENCE_URL=https://confluence.company.com');
console.log('   CONFLUENCE_PAT_TOKEN=your-confluence-token'); 