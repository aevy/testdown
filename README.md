# Testdown: browser smoke testing made easy

![License: MIT](https://img.shields.io/badge/license-MIT-lightgrey.svg)

Testdown is a kind of stupid QA robot that clicks around in your web
app, following your simple instructions to verify that the thing
basically works.

You provide instructions in plain English. The following paragraph is
an example.

*Enter "banana" into the recipe search box. Wait. See some
recipes. Click the recipe "banana smoothie". Look at the recipe
pane. See some ingredients. See some ingredients: "banana", "peanut
butter", "honey".*

This approach promotes a simple kind of medium-level smoke testing
that we think is valuable in addition to more rigorous testing.  You
can quite easily define a suite of basic tests formulated from the
perspective of user expectations.

To make that paragraph work as a test for your recipe app, you only
need to annotate the component nodes with a "role" attribute, like
`<article data-role=recipe>`, and so on for each concept.

Giving definite names to user interface concepts has several benefits.
Tests become cleaner from not being cluttered with arcane selector
syntaxes, and by writing tests on this semantic level, you avoid
coupling the suite to implementation details. Plus, it can hel with
establishing a ubiquitous language for talking about interface
components.

## Documentation

Will write more here...
