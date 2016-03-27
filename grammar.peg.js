{
  function trim(s) {
    return s.replace(/[ \n]+/gm, " ").trim()
  }
}

suite
  = "#" space title:line blank (comment blank)? scenarios:scenario*
{
  return {
    title: title,
    scenarios: scenarios
  }
}

space = [ \n]+
blank = [ \n]*
newline = " "* "\n"
line = text:[^\n]+ newline { return trim(text.join("")) }

scenario
  = "##" space "Scenario:" space title:line blank
    sentences:(sentenceAndSpace+)
{
  return {
    title: title,
    sentences: sentences.filter(function(x) { return !x.parsed.comment })
  }
}

sentenceAndSpace
  = s:sentence space
{
  return s
}

sentence
  = s:( login
      / wait
      / click
      / enter
      / look
      / see
      / scroll
      / comment
      )
{
  return {
    parsed: s,
    source: text().replace(/[ \n]+/g, " ").trim()
  }
}

// This should handle nested parentheses, at least if they are
// properly nested...
comment
  = "(" ([^()] / comment)* ")"
{
  return { comment: true }
}

login
  = "Log" space "in" space "as" space user:user "."
{
  return { login: user }
}

wait
  = "Wait" x:waitSpecifier? "."
{
  return { wait: { specifier: x } }
}

waitSpecifier
  = space "for" space spec:(
      np:definiteNounPhrase { return { noun: np } } /
      ts:timeSpecifier { return { time: ts } }
    )
{
  return spec
}

timeSpecifier
  = n:([0-9]+) space unit:("second" / "millisecond") "s"?
{
  return {
    milliseconds: parseInt(n.join('')) * (unit == "second" ? 1000 : 1)
  }
}

click
  = "Click" space np:definiteNounPhrase "."
{
  return { click: np }
}

quote
  = "\"" text:([^"]+) "\""
{
  return { quote: trim(text.join("")) }
}

enter
  = "Enter" space text:quote space "into" space np:definiteNounPhrase "."
{
  return { enter: { text: text, noun: np } }
}

look
  = mode:(
      ( "Now" space "look" { return "global" } )
      / "Look" { return "local" }
    )
    space "at" space np:definiteNounPhrase "."
{
  return { look: { noun: np, mode: mode } }
}

see
  = "See" space description:description "."
{
  return { see: description }
}

scroll
  = "Scroll" space "to" space "the" space
    direction:("top" / "bottom") space "of" space
    noun:definiteNounPhrase "."
{
  return {
    scroll: {
      noun: noun,
      direction: direction
    }
  }
}

description
  = quote
  / pluralDescription
  / quantifiedDescription
  / singularDescription

singularDescription
  = singularIndefiniteArticle space noun:singularNoun suffix:descriptionSuffix?
{
  return { a: noun, suffix: suffix }
}

singularNoun
  = x:([^.:"]+)
{ return trim(x.join("")) }

pluralDescription
  = "some" space noun:pluralNoun suffix:descriptionSuffix?
{
  return { some: noun, suffix: suffix }
}

quantifiedDescription
  = "exactly" space n:[0-9]+ noun:(pluralNoun / singularNoun)
{
  return { exactly: noun, count: parseInt(n) }
}

pluralNoun
  = &(noun:([^.:]+)
    &{ return noun[noun.length - 1] == "s" })
    (noun:[^.:]+)
{
  return trim(noun.join("").substr(0, noun.length - 1))
}

descriptionSuffix
  = ":" space quotes:quoteList
{
  return quotes
}

quoteList
  = q:quote qs:(
      ( "," space qs:quoteTail { return qs } )
      / (space "and" space qs:quote { return [qs] })
    )?
{
  return [q].concat(qs ? qs : [])
}

quoteTail
  = ("and" space qs:quote { return [qs] })
  / quoteList

singularIndefiniteArticle
  = &("a" "n"? space) "a" "n"?

user
  = s:([^.]+) { return trim(s.join("")) }

definiteNounPhrase
  = "the" space text:([^."]+) quote:quote?
{
  return {
    role: trim(text.join("")),
    description: quote
  }
}
