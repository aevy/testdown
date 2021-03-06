const grammar = require("./grammar.peg.js")

export function parseSuite(text) {
  return grammar.parse(text, { startRule: "suite" })
}

export function parseSentence(text) {
  return grammar.parse(text, { startRule: "sentence" })
}

export function parseDefiniteNounPhrase(text) {
  return grammar.parse(text, { startRule: "definiteNounPhrase" })
}

const ARBITRARY_ITEM_SELECTOR = (
  "span, a, li, header, h1, h2, h3, p, button, label"
)

export function runSuite(suite, configuration) {
  const reset = () => visit(configuration, "")
  return promiseMap(suite.scenarios, (x, i) => (
    reset().then(() => runScenario(x, configuration))
  )).then(
    result => reset().then(() => result)
  )
}

// Kind of like `Promise.all`, but sequential.
function promiseMap(xs, f) {
  const n = xs.length - 1
  const loop = i => f(xs[i], i).then(
    y => i >= n ? [y] : loop(i + 1).then(ys => [y, ...ys])
  )
  return loop(0)
}

//
// This is a map-like promise recursion scheme which stops on error
// and keeps state like a fold.  It's a generalized version of the
// function that runs a scenario, extracted to make that function
// less cluttered.
//
// The return value is an array made from applications of either
// `describe` or `fail`, depending on whether `f` failed for the
// corresponding value of `xs`.
//
function iterateOverSentencesWithThreadedState(
  xs, initialState, f, describe, fail
) {
  function loop(i, state) {
    const x = xs[i]
    return f(x, state).then(nextState => {
      return Promise.resolve(describe(x)).then(info =>
        i < xs.length - 1
          ? loop(i + 1, nextState || state)
              .then(rest => [info, ...rest])
          : [info]
      )
    }).catch(error =>
      Promise.resolve(fail(x, error)).then(info => [info])
    )
  }
  return loop(0, initialState)
}

function runScenario(scenario, configuration) {
  const { sentences, title } = scenario
  const { beforeScenario, errorDelay, root } = configuration
  const initialState = { place: root() }

  if (beforeScenario)
    beforeScenario(scenario)

  return iterateOverSentencesWithThreadedState(
    sentences, initialState,
    (sentence, { place }) =>
      runSentence(sentence, { place, configuration }),
    sentence =>
      ({ sentence: sentence.source, error: false }),
    (sentence, error) =>
      sleep(errorDelay).then(() => ({
        sentence: sentence.source, error: error.message
      }))
  ).then(result => ({
    scenario: title,
    error: last(result).error,
    result,
  }))
}

function last(xs) { return xs[xs.length - 1] }
function ignore(promise) { return promise.then(() => null) }

export function runSentence(sentence, { place, configuration }) {
  if (configuration.beforeSentence) {
    configuration.beforeSentence(sentence.source)
  }

  const locateLocally = noun => configuration.locate(place, noun)
  const locateGlobally = noun => configuration.locate(configuration.root(), noun)
  const locateOne = (noun, mode = "local") => (
    mode === "global"
      ? locateGlobally
      : locateLocally
  )(noun).then(nodes => nodes[0])

  const see = noun => ignore(locateLocally(noun))

  const types = {
    wait: ({ specifier }) => ignore(
      specifier
        ? (specifier.noun
            ? locateLocally(specifier.noun)
            : sleep(specifier.time.milliseconds))
        : sleep().then(() => waitForPredicate(configuration.isNotWaiting))
    ),

    click: noun =>
      locateOne(noun).then(elementClicker(configuration)),

    look: ({ noun, mode }) =>
      locateOne(noun, mode).then(x => ({ place: x })),

    scroll: ({ noun, direction }) => {
      return locateOne(noun).then(x => {
        configuration.setScrollTop(x, direction === "top" ? 0 : x.scrollHeight)
      })
    },

    see: description => {
      // XXX: should refactor
      if (description.quote) {
        return see({ role: null, description })
      } else if (description.a) {
        return see({
          role: description.a,
          // XXX: support multiple suffixes here
          description: description.suffix ? description.suffix[0] : null
        })
      } else if (description.exactly) {
        return locateLocally({
          role: description.exactly
        }).then(nodes => {
          if (nodes.length !== description.count) {
            throw new WrongNumberOfElements({
              place,
              role: description.exactly,
              expected: description.count,
              actual: nodes.length
            })
          }
        })
      } else if (description.some) {
        if (description.suffix && description.suffix instanceof Array) {
          // Looking for a set of matching things of the same role.
          return ignore(Promise.all(description.suffix.map(x => {
            if (!x.quote) {
              throw new Error("unexpected")
            }
            return see({
              role: description.some,
              description: x,
            })
          })))
        } else {
          return locateLocally({ role: description.some }).then(nodes => {
            if (nodes.length < 3) {
              throw new TooFewElements({
                place,
                count: nodes.length,
                role: description.some,
              })
            }
          })
        }
      } else {
        throw new Error(`Don't understand ${JSON.stringify(description)}`)
      }
    },

    enter: ({ text: { quote }, noun }) => {
      return locateOne(noun).then(element => {
        configuration.changeElementValue(element, quote)
        configuration.pressEnter(element)
      })
    }
  }

  const type = getSentenceType(sentence)
  const afterSentence = configuration.afterSentence || (() => {})
  return types[type](sentence.parsed[type]).then(x => {
    afterSentence(sentence.source)
    return x
  }).catch(e => {
    afterSentence(sentence.source, e)
    throw e
  })
}

function getSentenceType(x) {
  return Object.keys(x.parsed)[0]
}

function getSelectorForRole(role) {
  return (role && role !== "item")
    ? `[data-role="${role}"]`
    : ARBITRARY_ITEM_SELECTOR
}

export function locate(place, { role, description }) {
  return new Promise((resolve, reject) => {
    const selector = getSelectorForRole(role)
    const nodes = place.querySelectorAll(selector)
    const matches = filterCandidates(nodes, description)
    if (matches.length > 0) {
      resolve(matches)
    } else {
      reject(new NoMatchingElements({ role, description, place }))
    }
  })
}

export function retrying(functionToRetry, { attempts, delay }) {
  return function() {
    const args = [].slice.call(arguments, 0)
    const f = () => functionToRetry.apply(null, args)
    const loop = i =>
      i > 0
        ? f().catch(() => sleep(delay).then(() => loop(i - 1)))
        : f()
    return loop(attempts)
  }
}

function elementClicker(configuration) {
  return function clickOnElement(element) {
    function isProperLink(x) {
      return x.tagName === "A" && x.href &&
        x.href.length && !x.href.match(/^#/)
    }

    const target = findBetterClickTarget(element) || element
    if (isProperLink(target)) {
      visit(configuration, target.href)
    } else {
      configuration.click(target)
      configuration.focus(target)
    }

    return sleep(100)
  }
}

function visit(configuration, url) {
  const base = `${location.origin}/`
  configuration.visit(
    url.indexOf(base) === 0 ? url.substr(base.length) : url
  )
  return sleep(0)
}

class Failure extends Error {
  constructor(message) {
    super(message)
    this.message = message
    this.name = "Failure"
  }
}

class Timeout extends Failure {
  constructor() {
    super(`Waited ${WAIT_TIMEOUT_SECS} seconds; timed out.`)
  }
}

class SomeError extends Failure {
  constructor(error) {
    super(`Exception: ${error.message}`)
    this.error = error
  }
}

class TooFewElements extends Failure {
  constructor({ role, place, count }) {
    const countText = count === 1 ? "one" : count
    const roleText = `${role}${count === 1 ? "" : "s"}`
    super(`I found only ${countText} ${roleText}.`)
    this.role = role
    this.place = place
    this.count = count
  }
}

class WrongNumberOfElements extends Failure {
  constructor({ expected, actual, role, place }) {
    const roleText = `${role}${expected === 1 ? "" : "s"}`
    super(`Expected ${expected} ${roleText}, but found ${actual}.`)
    this.expected = expected
    this.actual = actual
    this.role = role
    this.place = place
  }
}

class NoMatchingElements extends Failure {
  constructor({ role, description, place }) {
    const roleText = role ? `a ${role}` : ""
    const descriptionText = description ? `"${description.quote}".` : ""
    super(`I don't see ${roleText} ${descriptionText}`)
    this.role = role
    this.description = description
    this.place = place
  }
}

class WeirdSentence extends Failure {
  constructor({ sentence }) {
    super(`Weird sentence: ${JSON.stringify(sentence)}`)
    this.sentence = sentence
  }
}

function contains(text, snippets) {
  function p(snippet) {
    return text.toLowerCase().indexOf(snippet.toLowerCase()) !== -1
  }
  return !(snippets instanceof Array) ? contains(text, [snippets])
    : snippets.map(x => p(x)).reduce((a, x) => a && x)
}

function filterCandidates(nodeList, description) {
  const matches = []
  for (let i = 0; i < nodeList.length; i++) {
    let text = getTextContentOfNode(nodeList[i])
    if (!description || contains(text, description.quote)) {
      matches.push(nodeList[i])
    }
  }
  return matches
}

function getTextContentOfNode(node) {
  // JSDOM doesn't support `innerText`, but most browsers do.
  return node.value || node.innerText || node.textContent
}

const WAIT_TIMEOUT_SECS = 10

function waitForPredicate(p) {
  function wait() {
    if (p()) {
      return true
    } else {
      return sleep().then(() => wait())
    }
  }
  return Promise.race([
    wait(),
    sleep(1000 * WAIT_TIMEOUT_SECS).then(() => {
      throw new Timeout()
    })
  ])
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms || 100)
  })
}

function findBetterClickTarget(node) {
  const good = "A BUTTON INPUT".split(" ")
  if (good.indexOf(node.tagName) !== -1) {
    return node
  } else if (node.parentElement) {
    return findBetterClickTarget(node.parentElement)
  } else {
    return null
  }
}

export function reactConfiguration({ ReactTestUtils }) {
  const { Simulate } = ReactTestUtils
  return {
    click: target => Simulate.click(target),
    focus: target => Simulate.focus(target),
    changeElementValue: (element, value) => {
      element.value = value
      Simulate.change(element)
    },
    pressEnter: element => {
      Simulate.keyDown(element, {
        key: "Enter",
        keyCode: 13,
        which: 13
      })
      Simulate.submit(element)
    },
    setScrollTop: (element, x) => {
      element.scrollTop = x
      Simulate.scroll(element)
    },
  }
}
