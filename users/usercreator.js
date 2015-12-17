function createUser(execlib, ParentUser) {
  'use strict';
  if (!ParentUser) {
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  var lib = execlib.lib;

  function User(prophash) {
    ParentUser.call(this, prophash);
    this.osDestroyedListener = null;
    var os = this.__service.state.get('outerSink'),
      p = this.purge.bind(this);
    if (!(os && os.destroyed)) {
      console.log('*SinkExposer created with no outerSink in __service');
      lib.runNext(p);
    } else {
      this.osDestroyedListener = os.destroyed.attach(p);
    }
  }
  
  ParentUser.inherit(User, require('../methoddescriptors/user'), [/*visible state fields here*/]/*or a ctor for StateStream filter*/);
  User.prototype.__cleanUp = function () {
    if(this.osDestroyedListener) {
      this.osDestroyedListener.destroy();
    }
    this.osDestroyedListener = null;
    ParentUser.prototype.__cleanUp.call(this);
  };

  User.prototype.purge = function () {
    console.log('remote outerSink is down');
    if (!this.destroyed) {
      console.log('but me ded already');
      return;
    };
    console.log(this.get('name'), this.__service.subSinkName, 'purging self');
    this.sessions.traverse(function (session) {
      session.destroy();
    });
  };

  return User;
}

module.exports = createUser;
