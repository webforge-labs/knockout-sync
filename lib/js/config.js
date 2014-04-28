var require = {
  packages: [
    {
      name: 'jquery',
      location: '../../lib/js/shimney/jquery'
    },
    {
      name: 'JSON',
      location: '../../lib/js/shimney/JSON'
    },
    {
      name: 'knockout',
      location: '../../lib/js/shimney/knockout'
    },
    {
      name: 'knockout-mapping',
      location: '../../lib/js/shimney/knockout-mapping'
    },
    {
      name: 'lodash',
      location: '../../lib/js/shimney/lodash'
    }
  ]
};

if (typeof exports === 'object') {
  module.exports = require;
}