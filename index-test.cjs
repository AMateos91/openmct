// Neutralize residual view registry rejections during asynchronous test teardown (afterAll)
if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', function (event) {
        if (event.reason && event.reason.stack && event.reason.stack.includes('ViewRegistry')) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
}

const testsContext = require.context('.', true, /^\.\/(src|example)\/.*Spec.js$/);
testsContext.keys().forEach(testsContext);
