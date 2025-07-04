/**
 * Unit tests for user ID helper utility
 */

import { 
  getUserIdentifier,
  normalizeUserData,
  createUserLookupQuery,
  validateUserIdentifier,
  formatUserForAssignment,
  extractUserFromApiResponse,
  normalizeUserList
} from '../../utils/user-id-helper.js';

describe('UserIdHelper', () => {
  describe('getUserIdentifier', () => {
    test('should extract accountId from Cloud user data', () => {
      const cloudUser = {
        accountId: '5b10a2844c20165700ede21g',
        displayName: 'John Doe',
        emailAddress: 'john@company.com'
      };

      const result = getUserIdentifier(cloudUser, 'cloud');
      expect(result).toBe('5b10a2844c20165700ede21g');
    });

    test('should extract name from Server user data', () => {
      const serverUser = {
        name: 'john.doe',
        displayName: 'John Doe',
        emailAddress: 'john@company.com'
      };

      const result = getUserIdentifier(serverUser, 'server');
      expect(result).toBe('john.doe');
    });

    test('should fallback to key for Server user data when name is missing', () => {
      const serverUser = {
        key: 'user-key-123',
        displayName: 'John Doe',
        emailAddress: 'john@company.com'
      };

      const result = getUserIdentifier(serverUser, 'server');
      expect(result).toBe('user-key-123');
    });

    test('should return null for invalid data', () => {
      expect(getUserIdentifier(null, 'cloud')).toBeNull();
      expect(getUserIdentifier({}, 'cloud')).toBeNull();
      expect(getUserIdentifier({ displayName: 'John' }, 'cloud')).toBeNull();
      expect(getUserIdentifier({ displayName: 'John' }, 'server')).toBeNull();
    });
  });

  describe('normalizeUserData', () => {
    test('should normalize Cloud user data', () => {
      const cloudUser = {
        accountId: '5b10a2844c20165700ede21g',
        accountType: 'atlassian',
        displayName: 'John Doe',
        emailAddress: 'john@company.com',
        active: true,
        avatarUrls: { '48x48': 'https://avatar.url' }
      };

      const result = normalizeUserData(cloudUser, 'cloud');

      expect(result).toEqual({
        id: '5b10a2844c20165700ede21g',
        displayName: 'John Doe',
        emailAddress: 'john@company.com',
        avatarUrls: { '48x48': 'https://avatar.url' },
        accountType: 'atlassian',
        active: true,
        original: cloudUser,
        deploymentType: 'cloud'
      });
    });

    test('should normalize Server user data', () => {
      const serverUser = {
        name: 'john.doe',
        displayName: 'John Doe',
        emailAddress: 'john@company.com',
        active: true
      };

      const result = normalizeUserData(serverUser, 'server');

      expect(result).toEqual({
        id: 'john.doe',
        displayName: 'John Doe',
        emailAddress: 'john@company.com',
        active: true,
        original: serverUser,
        deploymentType: 'server'
      });
    });

    test('should handle missing displayName', () => {
      const serverUser = {
        name: 'john.doe',
        emailAddress: 'john@company.com'
      };

      const result = normalizeUserData(serverUser, 'server');
      expect(result?.displayName).toBe('john.doe'); // fallback to name
    });

    test('should default active to true when not specified', () => {
      const serverUser = {
        name: 'john.doe',
        displayName: 'John Doe'
      };

      const result = normalizeUserData(serverUser, 'server');
      expect(result?.active).toBe(true);
    });

    test('should return null for invalid data', () => {
      expect(normalizeUserData(null, 'cloud')).toBeNull();
      expect(normalizeUserData({}, 'cloud')).toBeNull();
    });
  });

  describe('createUserLookupQuery', () => {
    test('should create Cloud lookup query', () => {
      const result = createUserLookupQuery('5b10a2844c20165700ede21g', 'cloud');
      expect(result).toEqual({ accountId: '5b10a2844c20165700ede21g' });
    });

    test('should create Server lookup query', () => {
      const result = createUserLookupQuery('john.doe', 'server');
      expect(result).toEqual({ username: 'john.doe' });
    });
  });

  describe('validateUserIdentifier', () => {
    test('should validate Cloud accountId', () => {
      const validId = '5b10a2844c20165700ede21g';
      const result = validateUserIdentifier(validId, 'cloud');
      expect(result.isValid).toBe(true);
    });

    test('should reject short Cloud accountId', () => {
      const shortId = '123';
      const result = validateUserIdentifier(shortId, 'cloud');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too short');
    });

    test('should reject Cloud accountId with special characters', () => {
      const invalidId = '5b10a2844c20165700ede21g@';
      const result = validateUserIdentifier(invalidId, 'cloud');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('alphanumeric');
    });

    test('should validate Server username', () => {
      const validUsernames = ['john.doe', 'user123', 'test-user', 'user_name'];
      
      validUsernames.forEach(username => {
        const result = validateUserIdentifier(username, 'server');
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject Server username with invalid characters', () => {
      const invalidUsername = 'user@domain';
      const result = validateUserIdentifier(invalidUsername, 'server');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    test('should reject empty identifiers', () => {
      expect(validateUserIdentifier('', 'cloud').isValid).toBe(false);
      expect(validateUserIdentifier('', 'server').isValid).toBe(false);
      expect(validateUserIdentifier(null as any, 'cloud').isValid).toBe(false);
    });
  });

  describe('formatUserForAssignment', () => {
    test('should format Cloud user for assignment', () => {
      const result = formatUserForAssignment('5b10a2844c20165700ede21g', 'cloud');
      expect(result).toEqual({ accountId: '5b10a2844c20165700ede21g' });
    });

    test('should format Server user for assignment', () => {
      const result = formatUserForAssignment('john.doe', 'server');
      expect(result).toEqual({ name: 'john.doe' });
    });
  });

  describe('extractUserFromApiResponse', () => {
    test('should extract user from response with user field', () => {
      const response = {
        user: {
          accountId: '5b10a2844c20165700ede21g',
          displayName: 'John Doe'
        }
      };

      const result = extractUserFromApiResponse(response, 'cloud');
      expect(result).toBe('5b10a2844c20165700ede21g');
    });

    test('should extract user from response with assignee field', () => {
      const response = {
        assignee: {
          name: 'john.doe',
          displayName: 'John Doe'
        }
      };

      const result = extractUserFromApiResponse(response, 'server');
      expect(result).toBe('john.doe');
    });

    test('should extract user from direct response', () => {
      const response = {
        accountId: '5b10a2844c20165700ede21g',
        displayName: 'John Doe'
      };

      const result = extractUserFromApiResponse(response, 'cloud');
      expect(result).toBe('5b10a2844c20165700ede21g');
    });

    test('should return null for invalid response', () => {
      expect(extractUserFromApiResponse(null, 'cloud')).toBeNull();
      expect(extractUserFromApiResponse({}, 'cloud')).toBeNull();
    });
  });

  describe('normalizeUserList', () => {
    test('should normalize array of users', () => {
      const users = [
        {
          accountId: '5b10a2844c20165700ede21g',
          displayName: 'John Doe',
          emailAddress: 'john@company.com'
        },
        {
          accountId: '5b10a2844c20165700ede21h',
          displayName: 'Jane Doe',
          emailAddress: 'jane@company.com'
        }
      ];

      const result = normalizeUserList(users, 'cloud');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('5b10a2844c20165700ede21g');
      expect(result[0].deploymentType).toBe('cloud');
      expect(result[1].id).toBe('5b10a2844c20165700ede21h');
    });

    test('should handle mixed valid/invalid users', () => {
      const users = [
        {
          accountId: '5b10a2844c20165700ede21g',
          displayName: 'John Doe'
        },
        {
          displayName: 'Invalid User' // missing accountId
        },
        {
          accountId: '5b10a2844c20165700ede21h',
          displayName: 'Jane Doe'
        }
      ];

      const result = normalizeUserList(users, 'cloud');

      expect(result).toHaveLength(2); // Only valid users
      expect(result[0].id).toBe('5b10a2844c20165700ede21g');
      expect(result[1].id).toBe('5b10a2844c20165700ede21h');
    });

    test('should return empty array for invalid input', () => {
      expect(normalizeUserList(null as any, 'cloud')).toEqual([]);
      expect(normalizeUserList('not array' as any, 'cloud')).toEqual([]);
      expect(normalizeUserList([], 'cloud')).toEqual([]);
    });
  });
}); 