import React from "react"
import ReactDOM from "react-dom"
import ReactTestUtils from "react-addons-test-utils"

import * as Testdown from "../index.js"

import exampleSuite from "./example-suite.md"

let state

class App extends React.Component {
  render() {
    return (
      <div data-role="app">
        <button data-role="button">Click me</button>
      </div>
    )
  }
}

document.body.innerHTML += '<div id="app"/>'

function setState(newState) {
  state = newState
  ReactDOM.render(<App state={state}/>, app)
}

setState({})

window.test = function test() {
  const suite = Testdown.parseSuite(exampleSuite)
  Testdown.runSuiteSequentially(suite, {
    root: app,
    locate: Testdown.locate,
    ...Testdown.reactConfiguration({ ReactTestUtils }),
  }).then(x => console.info(x))
}

test()
