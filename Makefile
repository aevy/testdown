src = grammar.peg.js index.js
dist = dist/grammar.peg.js dist/index.js

peg-options = --allowed-start-rules start,sentence

test: build;
	./node_modules/.bin/mocha --compilers js:babel-register

build: package.json $(dist)
build-metatest: dist/test/index.html
clean:; rm -rf dist && mkdir dist

dist/grammar.peg.js: grammar.peg.js
	./node_modules/.bin/pegjs $(peg-options) $< $@

dist/index.js: index.js; ./node_modules/.bin/babel $< > $@

.PHONY: clean build
