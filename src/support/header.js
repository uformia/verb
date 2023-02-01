var isNode = new Function("try {return this===global;}catch(e){return false;}");
var isWebworker = new Function("try {return typeof importScripts === 'function';}catch(e){return false;}");
var isNodeWorker = function () { try { const worker_threads = require('worker_threads'); return !worker_threads.isMainThread; } catch (e) {return false; } }

// node.js context, but not WebWorker
if (isNode() && !isWebworker()) {
    Worker = require('worker_threads').Worker;
    // Emulate the WebWorker onmessage event handler
    Object.defineProperty(Worker.prototype, 'onmessage', {
        set: function (callback) {
            if (this._onmessageCallback) {
                this.removeListener('message', this._onmessageCallback);
            }
            this._onmessageCallback = function (data) { callback({ data: data }); }
            this.on('message', this._onmessageCallback);
        }
    })
}

if (isNode() || isWebworker() || isNodeWorker()) {
    var window = global; // required for promhx

    // WebWorker
    if (isWebworker()) {
        var lookup = function (className, methodName) {

            var obj = global;

            className.split(".").forEach(function (x) {
                if (obj) obj = obj[x];
            });

            if (!obj) return null;

            return obj[methodName];
        }

        onmessage = function (e) {

            if (!e.data.className || !e.data.methodName) return;

            var method = lookup(e.data.className, e.data.methodName);

            if (!method) {
                return console.error("could not find " + e.data.className + "." + e.data.methodName)
            }

            postMessage({ result: method.apply(null, e.data.args), id: e.data.id });

        };
    } else if (isNodeWorker()) {
        // Can't do destructuring assignment because old uglify-js
        const workerThreads = require('worker_threads');
        const parentPort = workerThreads.parentPort;

        const lookup = function (className, methodName) {

            var obj = exports;

            className.split(".").forEach(function (x) {
                if (obj) obj = obj[x];
            });

            if (!obj) return null;

            return obj[methodName];
        }

        parentPort.on('message', function (data) {
            if (!data.className || !data.methodName) return;

            var method = lookup(data.className, data.methodName);

            if (!method) {
                return console.error("could not find " + data.className + "." + data.methodName)
            }

            parentPort.postMessage({ result: method.apply(null, data.args), id: data.id });
        })
    }
}