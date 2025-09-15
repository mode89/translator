(ns tests.app-test)

(defn bar []
  (assert false))

(defn foo []
  (bar))

(defn ^:test hello-world []
  (foo))

(defn ^:test another-test []
  (assert (= 1 2)))
