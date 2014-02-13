define(['knockout', 'knockout-mapping'], function(ko, koMapping) {
  
  return function(data, mapping) {
    var that = this;

    koMapping.fromJS(data, mapping || {}, that);

    that.fqn = 'ACME.Blog.Entities.ContentStream.Stream';
  };

});