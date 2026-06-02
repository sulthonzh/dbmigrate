// Test setup file
// Clean up test artifacts before each test
beforeEach(() => {
  // Reset any global state
  if ((globalThis as any).__dbmigrate_test_cleanup) {
    (globalThis as any).__dbmigrate_test_cleanup();
  }
});

afterEach(() => {
  // Clean up after each test
  if ((globalThis as any).__dbmigrate_test_cleanup) {
    (globalThis as any).__dbmigrate_test_cleanup();
  }
});