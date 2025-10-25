# Testing Guide

This project uses Jest for testing with a well-organized test structure.

## Test Structure

```
tests/
├── unit/           # Unit tests for individual components and functions
├── integration/    # Integration tests for component interactions
├── e2e/           # End-to-end tests (future)
├── fixtures/       # Test data and mock files
├── utils/          # Test utilities and helpers
└── setup.js        # Jest setup configuration
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only (when implemented)
npm run test:e2e
```

### CI Mode
```bash
npm run test:ci
```

## Test Categories

### Unit Tests (`tests/unit/`)
- Test individual functions and components in isolation
- Fast execution
- No external dependencies
- Examples:
  - `enumValues.test.js` - Tests enum definitions
  - `avoidStairsLogic.test.js` - Tests business logic
  - `multiChoiceLogic.test.js` - Tests UI logic

### Integration Tests (`tests/integration/`)
- Test component interactions
- Test complete workflows
- May use mock data
- Examples:
  - `profileSetup.test.js` - Tests complete profile setup flow

### E2E Tests (`tests/e2e/`)
- Test complete user workflows
- Test real browser interactions
- Slower execution
- Future implementation

## Test Utilities

### `tests/utils/testHelpers.js`
Contains helper functions for creating test data:
- `createMockUserProfile()` - Creates mock user profiles
- `createMockPOI()` - Creates mock POI data
- `TestDataGenerators` - Generates test data sets
- `AsyncTestHelpers` - Utilities for async testing
- `MockAPIResponses` - Mock API response templates

### `tests/fixtures/`
Contains static test data files:
- Sample user profiles
- Mock API responses
- Test configuration files

## Writing Tests

### Test File Naming
- Unit tests: `*.test.js`
- Integration tests: `*.test.js`
- E2E tests: `*.test.js`

### Test Structure
```javascript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup before each test
  });
  
  afterEach(() => {
    // Cleanup after each test
  });
  
  describe('Feature Group', () => {
    test('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Best Practices
1. **Descriptive test names** - Use clear, descriptive test names
2. **Arrange-Act-Assert** - Structure tests clearly
3. **Mock external dependencies** - Use mocks for APIs and external services
4. **Test edge cases** - Include tests for error conditions
5. **Keep tests focused** - One concept per test
6. **Use test utilities** - Leverage helper functions for common operations

## Configuration Files

- `jest.config.js` - Jest configuration
- `babel.config.js` - Babel configuration for JSX support
- `tests/setup.js` - Global test setup and mocks

## Coverage

Coverage reports are generated in the `coverage/` directory:
- HTML report: `coverage/lcov-report/index.html`
- Text summary: Console output
- LCOV format: `coverage/lcov.info`

## Continuous Integration

The `test:ci` script is optimized for CI environments:
- No watch mode
- Coverage reporting
- Exit codes for build systems
- Optimized for parallel execution

## Adding New Tests

1. **Choose the right category** - Unit, integration, or E2E
2. **Create test file** - Use descriptive naming
3. **Import dependencies** - Include necessary modules and utilities
4. **Write test cases** - Follow the established patterns
5. **Run tests** - Verify they pass
6. **Update documentation** - Add to this README if needed

## Debugging Tests

### Debug Mode
```bash
# Run specific test file
npm test -- --testNamePattern="specific test name"

# Run tests in specific directory
npm test -- tests/unit/

# Debug mode (Node.js debugger)
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Common Issues
1. **Import errors** - Check module paths and extensions
2. **Mock issues** - Verify mock setup in `tests/setup.js`
3. **Async tests** - Use proper async/await patterns
4. **Environment issues** - Check Jest configuration

## Future Enhancements

- [ ] E2E testing with Playwright or Cypress
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] API contract testing
