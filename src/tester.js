var R = require('ramda');
var m = require('mithril'); // hello, my old friend
var flyd = require('flyd'); // hello, my new friend

// Could use object literal notation, but I don't think it's as readable when functions are involved
var Tester = {};

// Helper function to force redraw whenever a test stream updates
var onStatus = function() {
  // this will always force redraw, skipping Mithril's auto-redraw system
  // if I used start/endComputation instead, there wouldn't be live updates on the page
  // this won't thrash animation frames, though
  m.redraw();
};

// this is a really big controller, can probably refactor into a really nice model and make this thin
Tester.controller = function (args) {
  var ctrl = {};

  ctrl.tests = R.clone(args.tests); // will copy functions by reference, so doesn't break test closures
  
  //generate streams for all the tests
  ctrl.tests.forEach(function(val) {
    val.stream = flyd.stream('notRun');
  });
  
  // extracts an array of streams from the tests
  var allTests = R.map(R.prop('stream'), ctrl.tests);
  
  var allStream = flyd.stream(allTests, function() {
    // rebuilding this entire atom every time isn't the best idea, but it'd be a bunch of scans otherwise
    // wonder which is more performant
    var atom = {
      notRun: 0,
      running: 0,
      passed: 0,
      failed: 0,
      complete: false
    };

    R.forEach(function(val) {
      var result = val();

      // could use R.cond here to clean up
      if (atom[result] !== undefined) {
        atom[result] += 1;
      } else if (result === true) {
        atom.passed += 1;
      } else if (result === false) {
        atom.failed += 1;
      }
    }, allTests);

    if (atom.passed + atom.failed === allTests.length) { atom.complete = true; }
    
    return atom;
  });

  flyd.on(onStatus, allStream);

  flyd.on(function(x) {
    ctrl.atom = x;
  }, allStream);

  //on click handler for tests initialize tests
  ctrl.startTests = function() {
    R.forEach(function(test) {
      test.stream('running');
      test.run(test.stream);
    }, ctrl.tests);
  };

  return ctrl;
};

// helper function to render every test
var testTemplate = function(test) {
  return m('tr', [
    m('td.desc', test.description),
    // random optimization thought: pregenerate every possible result status element and clone as needed
    // also add colors, cause everyone loves colors
    m('td.result', R.cond([
      [R.equals('notRun'), R.always('Not Started Yet')],
      [R.equals('running'), R.always('Running')],
      [R.equals(true), R.always('Passed')],
      [R.equals(false), R.always('Failed')]
    ])(test.stream()))
  ]);
};
      

Tester.view = function(ctrl) {
  return m('div', [
    m('table.status', [
      //still need ti insert the button here to call ctrl.startTests
      m('tr', [
        m('td', [
          m('button', {onclick: ctrl.startTests}, 'Start Tests')
        ]),
        m('td', ctrl.atom.complete ? 'COMPLETED!' : '') 
      ]),
      m('tr', [
        m('td', 'Running:'),
        m('td', ctrl.atom.running) // I feel like I'm two findAlls away from this being a React template o_o;
      ]),
      m('tr', [
        m('td', 'Passed:'),
        m('td', ctrl.atom.passed) 
      ]),
      m('tr', [
        m('td', 'Failed:'),
        m('td', ctrl.atom.failed)
      ])
    ]),
    m('table.tests', R.map(testTemplate, ctrl.tests))
  ]);
};

module.exports = Tester;
