import React from "react"
import ReactDOM from "react-dom"
import ReactTestUtils from "react-addons-test-utils"

import * as Testdown from "../index.js"

import exampleSuite from "./example-suite.md"

let state

const actions = {
  increment: () => setState({ counter: state.counter + 1 }),
}

class App extends React.Component {
  render() {
    return (
      <div data-role="app">
        <span data-role="counter">
          {this.props.counter}
        </span>
        <button
          data-role="button"
          onClick={actions.increment}
        >
          Click me
        </button>
      </div>
    )
  }
}

document.body.innerHTML += '<div id="app"/>'

function setState(newState) {
  location.hash = JSON.stringify({ ...state, ...newState })
}

window.onhashchange = function(hash) {
  if (location.hash) {
    state = JSON.parse(location.hash.substr(1))
    ReactDOM.render(<App {...state}/>, app)
  } else {
    setState({ counter: 0 })
  }
}

onhashchange()

window.test = function test() {
  const suite = Testdown.parseSuite(exampleSuite)
  Testdown.runSuiteSequentially(suite, {
    root: () => app,
    locate: Testdown.locate,
    visit: url => location.hash = url,
    ...Testdown.reactConfiguration({ ReactTestUtils }),
  }).then(x => console.info(x))
}

setTimeout(test, 0)
