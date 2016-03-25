const grammar = require("./grammar.peg.js")

export function parseSuite(text) {
  return grammar.parse(text).suite
}

export function parseSentence(text) {
  return grammar.parse(text, { startRule: "sentence" })
}

export function startScenario(scenario, options) {
  options.onScenarioDone()
}

const ARBITRARY_ITEM_SELECTOR = (
  "span, a, li, header, h1, h2, h3, p, button, label"
)

export function runSentence(sentence, { place, configuration }) {
  const types = {
    wait: ({ specifier }) => (
      specifier
        ? (specifier.noun
            ? locate(place, specifier.noun)
            : sleep(specifier.time.milliseconds))
        : waitForPredicate(configuration.isNotWaiting)
    ).then(() => null),

    click: noun =>
      locateOne(place, noun).then(elementClicker(configuration)),

    look: ({ noun, mode }) =>
      locateOne(place, noun).then(x => ({ place: x })),

    scroll: ({ noun, direction }) => {
      return locateOne(place, noun).then(x => {
        configuration.setScrollTop(x, direction === "top" ? 0 : x.scrollHeight)
      })
    },

    see: description => {
      // XXX: should refactor
      if (description.quote) {
        return locate(place, { role: null, description })
      } else if (description.a) {
        return locate(place, {
          role: description.a,
          // XXX: support multiple suffixes here
          description: description.suffix ? description.suffix[0] : null
        })
      } else if (description.exactly) {
        return this.locate(place, {
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
          return Promise.all(description.suffix.map(x => {
            if (!x.quote) {
              throw new Error("unexpected")
            }
            return locate(place, {
              role: description.some,
              description: x,
            })
          }))
        } else {
          return locate(place, { role: description.some }).then(nodes => {
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
      return locateOne(place, noun).then(element => {
        configuration.changeElementValue(element, quote)
        configuration.pressEnter(element)
      })
    }
  }

  const type = getSentenceType(sentence)
  return types[type](sentence.parsed[type])
}

function getSelectorForRole(role) {
  return (role && role !== "item")
    ? `[data-role="${role}"]`
    : ARBITRARY_ITEM_SELECTOR
}

function locate(place, { role, description, triesSoFar }) {
  return new Promise((resolve, reject) => {
    const selector = getSelectorForRole(role)
    const nodes = place.querySelectorAll(selector)
    const matches = filterCandidates(nodes, description)
    if (matches.length > 0) {
      resolve(matches)
    } else if (triesSoFar > 10) {
      reject(new NoMatchingElements({ role, description, place }))
    } else {
      sleep(100).then(
        () => locate(place, {
          role,
          description,
          triesSoFar: (triesSoFar || 0) + 1
        })
      ).then(resolve, reject)
    }
  })
}

function locateOne(place, noun) {
  return locate(place, noun).then(nodes => nodes[0])
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
}

function getSuiteId(suite) {
  return Object.keys(suites).filter(
    x => suites[x].title === suite.title
  )[0]
}

function getSentenceType(x) {
  return Object.keys(x.parsed)[0]
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
    const text = (
      nodeList[i].value || nodeList[i].innerText || nodeList[i].textContent
    )
    if (!description || contains(text, description.quote)) {
      matches.push(nodeList[i])
    }
  }
  return matches
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
    wait,
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
