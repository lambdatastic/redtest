var m = require('mithril');
var tests = require('./testGen.js');
var Tester = require('./tester.js');

var initTester = m.component(Tester, {tests: tests});

m.mount(document.body, initTester);
