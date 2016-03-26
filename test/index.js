import {
  parseSuite, parseSentence, startScenario, runSentence
} from "../dist"

import assert from "assert"

import { readFileSync } from "fs"
import { jsdom } from "jsdom"
import { spy } from "sinon"

import React from "react"
import { renderIntoDocument } from "react-addons-test-utils"
import { findDOMNode } from "react-dom"

function parseSuiteFromFile(filename) {
  return parseSuite(readFileSync(filename).toString())
}

const expectedParsedSuiteFile = {
  title: "Parser Suite",
  scenarios: [
    {
      title: "Clicking the button",
      sentences: [
        {
          source: "Click the button.",
          parsed: {
            click: {
              role: "button",
              description: null
            }
          }
        }
      ]
    },
    {
      title: "Clicking and waiting",
      sentences: [
        {
          source: "Click the button.",
          parsed: {
            click: {
              role: "button",
              description: null
            }
          }
        },
        {
          source: "Wait.",
          parsed: {
            wait: {
              specifier: null
            }
          }
        },
      ]
    },
  ]
}

describe("Parser", function() {
  describe("files", function() {
    it("should parse the empty test suite file", function() {
      assert.deepEqual(
        parseSuiteFromFile("./test/empty-suite-file.md"),
        {
          title: "Empty suite",
          scenarios: []
        }
      )
    })

    it("should parse the example test suite file", function() {
      assert.deepEqual(
        parseSuiteFromFile("./test/parser-suite-file.md"),
        expectedParsedSuiteFile
      )
    })
  })

  describe("sentences", function() {
    function sentence(text, result) {
      it(`"${text}"`, function() {
        assert.deepEqual(parseSentence(text), {
          parsed: result,
          source: text
        })
      })
    }

    sentence('Log in as Mikael.', {
      login: "Mikael"
    })

    describe("Wait...", function() {
      sentence('Wait.', {
        wait: { specifier: null }
      })

      sentence('Wait for 1 second.', {
        wait: {
          specifier: {
            time: {
              milliseconds: 1000
            }
          }
        }
      })

      sentence('Wait for 500 milliseconds.', {
        wait: {
          specifier: {
            time: {
              milliseconds: 500
            }
          }
        }
      })

      sentence('Wait for the result.', {
        wait: {
          specifier: {
            noun: {
              role: "result",
              description: null
            }
          }
        }
      })

      sentence('Wait for the result "foo".', {
        wait: {
          specifier: {
            noun: {
              role: "result",
              description: {
                quote: "foo"
              }
            }
          }
        }
      })
    })

    describe("Click...", function() {
      sentence('Click the button.', {
        click: {
          role: "button",
          description: null
        }
      })

      sentence('Click the button "Submit".', {
        click: {
          role: "button",
          description: {
            quote: "Submit"
          }
        }
      })
    })

    describe("Enter...", function() {
      sentence('Enter "foo" into the search box.', {
        enter: {
          text: { quote: "foo" },
          noun: {
            role: "search box",
            description: null
          }
        }
      })

      sentence('Enter "foo" into the search box "Search".', {
        enter: {
          text: { quote: "foo" },
          noun: {
            role: "search box",
            description: {
              quote: "Search"
            }
          }
        }
      })
    })

    describe("Look...", function() {
      sentence('Look at the sidebar.', {
        look: {
          mode: "local",
          noun: {
            role: "sidebar",
            description: null
          }
        }
      })

      sentence('Look at the box "contents".', {
        look: {
          mode: "local",
          noun: {
            role: "box",
            description: {
              quote: "contents"
            }
          }
        }
      })

      sentence('Now look at the app.', {
        look: {
          mode: "global",
          noun: {
            role: "app",
            description: null
          }
        }
      })

      sentence('Now look at the box "contents".', {
        look: {
          mode: "global",
          noun: {
            role: "box",
            description: {
              quote: "contents"
            }
          }
        }
      })
    })

    describe("Scroll...", function() {
      sentence('Scroll to the bottom of the box "results".', {
        scroll: {
          direction: "bottom",
          noun: {
            role: "box",
            description: {
              quote: "results"
            }
          }
        }
      })

      sentence('Scroll to the top of the box "results".', {
        scroll: {
          direction: "top",
          noun: {
            role: "box",
            description: {
              quote: "results"
            }
          }
        }
      })
    })

    describe("See...", function() {
      sentence('See a message.', {
        see: {
          a: "message",
          suffix: null
        }
      })

      sentence('See a message: "hello", "goodbye".', {
        see: {
          a: "message",
          suffix: [
            { quote: "hello" },
            { quote: "goodbye" }
          ]
        }
      })

      sentence('See "hello".', {
        see: {
          quote: "hello"
        }
      })

      sentence('See exactly 3 results.', {
        see: {
          exactly: "result",
          count: 3
        }
      })

      sentence('See some results.', {
        see: {
          some: "result",
          suffix: null
        }
      })

      sentence('See some results: "foo", "bar".', {
        see: {
          some: "result",
          suffix: [
            { quote: "foo" },
            { quote: "bar" }
          ]
        }
      })
    })
  })
})

function makeScenario(...sentences) {
  return {
    title: "Test scenario",
    sentences: sentences.map(parseSentence)
  }
}

function makeSuite(...scenarios) {
  return {
    title: "Test suite",
    scenarios
  }
}

describe("runner", function() {
  it("should run empty scenario", function(done) {
    return startScenario(makeScenario(), {
      onScenarioDone: function() {
        done()
      }
    })
  })

  describe("sentences", function() {
    const body = jsdom("<!doctype html><body></body>").body
    beforeEach(() => { body.innerHTML = "" })

    describe("Wait...", function() {
      it("succeeds immediately", function() {
        return runSentence(parseSentence("Wait."), {
          configuration: {
            isNotWaiting() {
              return true
            }
          }
        }).then(x => {
          assert.equal(x, null)
        })
      })

      it("succeeds after a few times", function() {
        let i = 3
        return runSentence(parseSentence("Wait."), {
          configuration: {
            isNotWaiting() {
              return i-- == 0
            }
          }
        }).then(x => {
          assert.equal(x, null)
        })
      })

      it("finds a present DOM node", function() {
        insertNodeWithRole(body, "div", "thing")
        return runSentence(parseSentence("Wait for the thing."), {
          place: body
        }).then(x => {
          assert.equal(x, null)
        })
      })

      it("finds a DOM node that appears after a while", function() {
        setTimeout(() => insertNodeWithRole(body, "div", "thing"), 200)
        return runSentence(parseSentence("Wait for the thing."), {
          place: body
        }).then(x => {
          assert.equal(x, null)
        })
      })
    })

    describe("Click...", function() {
      it("clicks the button", function() {
        const button = insertNodeWithRole(body, "div", "button")
        const click = spy()
        const focus = spy()
        return runSentence(parseSentence("Click the button."), {
          place: body,
          configuration: { click, focus }
        }).then(x => {
          assert.equal(x, null)
          assert.ok(click.calledWith(button))
          assert.ok(focus.calledWith(button))
        })
      })
    })

    describe("Enter...", function() {
    })
  })
})

describe("Text runner with React in JSDOM", function() {
  global.document = jsdom("<!doctype html><html><body></body></html>")
  global.window = global.document.defaultView

  let root, app

  const App = React.createClass({
    getInitialState() {
      return {
        counter: 1
      }
    },
    render() {
      return (
        <div>
          <div data-role="counter">
            {this.state.counter}
          </div>
          <div
            ref="incrementButton"
            data-role="increment button"
            onClick={this.increment} />
        </div>
      )
    },
    increment() {
      this.setState({ counter: this.state.counter + 1 })
    }
  })

  beforeEach(function() {
    app = renderIntoDocument(<App/>)
    root = findDOMNode(app)
  })

  function run(text, configuration = {}) {
    return runSentence(parseSentence(text), { place: root, configuration })
  }

  it("sees the initial counter", function() {
    return run(`See a counter: "1".`)
  })

  it("clicks the button", function() {
    const click = spy()
    const focus = spy()
    return run(`Click the increment button.`, {
      click, focus
    }).then(function() {
      assert.ok(click.calledWith(app.refs.incrementButton))
      assert.ok(focus.calledWith(app.refs.incrementButton))
    })
  })
})

function insertNodeWithRole(root, type, role) {
  root.innerHTML += `<${type} data-role="${role}"/>`
  return root.children[root.children.length - 1]
}
