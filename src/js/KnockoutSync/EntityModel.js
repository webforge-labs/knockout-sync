define(['require', 'lodash'], function(require, _) {

  /**
   * Before creating the model from the JSONModel all entityModelClasses have to be loaded with require (or define()) before!
   */
  
  return function(jsonModel) {
    var that = this;
    var model = jsonModel;


    this.getEntities = function() {
      return model.entities;
    };

    this.getNamespace = function() {
      return model.namespace.replace(/\\/g, '.');
    };

    that.meta = {};
    _.each(model.entities, function(entityMeta) {
      entityMeta.name = entityMeta.name.replace(/\\/g, '.');

      entityMeta.fqn = entityMeta.fqn.replace(/\\/g, '.');
      entityMeta.modelClass = require(entityMeta.fqn.replace(/\./g, '/')+'Model');

      that.meta[entityMeta.fqn] = entityMeta;

      _.each(entityMeta.properties || [], function(property, name) {
        if (!property.name) {
          property.name = name;
        }

        property.type = property.type.replace(/\\/g, '.');

      });

    });

    this.getEntityMeta = function(entityFQN) {
      if (!that.meta[entityFQN]) {
        throw new Error('Entity with fqn: '+entityFQN+' not found. FQNs are: '+_.keys(that.meta).join(', '));
      }

      return that.meta[entityFQN];
    };

  };

});