const assert = require("node:assert");
const fs = require("fs");
const test = require("node:test");
const { scittle }  = require("../node_modules/scittle/dist/scittle.js");

function loadClojureScript(path) {
    const content = fs.readFileSync(path, "utf-8");
    scittle.core.eval_string(`(set! *file* "${path}") ${content}`);
}

function loadTestsFrom(path) {
    for (const entry of fs.readdirSync(path, { withFileTypes: true })) {
        if (entry.isFile && entry.name.endsWith("-test.cljs")) {
            loadClojureScript(`tests/${entry.name}`);
            const ns = scittle.core.eval_string(`
              (str *ns*)
            `);
            const testFns = scittle.core.eval_string(`
              (->> (ns-publics '${ns})
                   vals
                   (filter #(:test (meta %)))
                   (map #(array
                          (str (:ns (meta %)) "/" (:name (meta %)))
                               (deref %)))
                   into-array)
            `);
            for (const [name, fn] of testFns) {
                test(name, () => {
                    const err0 = catchError(fn);
                    if (err0) {
                        const err = new Error();
                        err.message = err0.message;
                        err.stack = err0.stack.join("\n");
                        throw err;
                    }
                });
            }
        }
    }
}

globalThis.foo = 42;

scittle.core.eval_string(`
  (println js/foo)
`);

const catchError = scittle.core.eval_string(`
  (fn [func]
    (try (func) nil
      (catch ^:sci/error js/Error e
        #js {:message (.-message e)
             :stack (->> (sci.core/stacktrace e)
                         sci.core/format-stacktrace
                         into-array)})))
`);

// loadClojureScript("app.cljs");
loadTestsFrom("tests");
