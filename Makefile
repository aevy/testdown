src = grammar.peg.js index.js
dist = dist/grammar.peg.js dist/index.js

peg-options = --allowed-start-rules suite,sentence,definiteNounPhrase

test: build;
	./node_modules/.bin/mocha --compilers js:babel-register

build: package.json $(dist)
clean:; rm -rf dist && mkdir dist

dist/grammar.peg.js: grammar.peg.js
	./node_modules/.bin/pegjs $(peg-options) $< $@

dist/index.js: index.js; ./node_modules/.bin/babel $< > $@

serve-example:
	./node_modules/.bin/webpack-dev-server -d --host 0.0.0.0

.PHONY: clean build
