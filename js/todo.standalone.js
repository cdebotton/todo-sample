(function(){

	"use strict";

	/**
	 * The EventBus. Used to communicate between modules/classes.
	 */

	 namespace('Todo.EventBus');
	 Todo.EventBus = _.extend({}, Backbone.Events);

	/**
	 * The AppView. The first thing that will be instantiated by the application.
	 * @class AppView
	 * @constructor
	 */

	namespace('Todo.App.View');
	Todo.App.View = Backbone.View.extend({
		
		el: "#todo-viewport",
		
		events: {
			'mouseenter #add': 'peekPanel',
			'mouseleave #add': 'hidePanel',
			'click #add': 'createTodo'
		},
		
		initialize: function () {
			_.bindAll(this);
			this.panel = new Todo.Panel.View({
				model: this.model
			});
			this.list = new Todo.List.View({
				model: this.model
			});
			this.description = new Todo.Description.View({
				model: this.model
			});
			this.overview = new Todo.OverviewView.View({
				model: this.model
			});
		},

		peekPanel: function (e) {
			Todo.EventBus.trigger('peek-panel');
		},

		hidePanel: function (e) {
			Todo.EventBus.trigger('hide-panel');
		},

		createTodo: function (e) {
			this.model.todos.add();
			e.preventDefault();
		}
	});

	/**
	 * The AppModel. This will manage all sub-modules for the application.
	 * @class AppModel
	 * @constructor
	 */

	namespace('Todo.App.Model');
	Todo.App.Model = Backbone.Model.extend({
		
		initialize: function () {
			this.todos = this.nestCollection(this, 'todos', new Todo.Item.Collection(this.get('todos')));
		},

		nestCollection: function (model, attributeName, nestedCollection) {
			model.attributes[attributeName] = [];
			for(i in nestedCollection.length) {
				model.attributes[attributeName][i] = nestedCollection.at(i);
			}

			nestedCollection.on('add', function (initiative) {
				if(!model.get(attributeName)) {
					model.attributes[attributeName] = [];
				}
				model.get(attributeName).push(initiative.attributes);
			});

			nestedCollection.on('remove', function (initiative) {
				var updateObj = {};
				updateObj[attributeName] = _.without(model.get(attributeName), initiative.attributes);
			});

			return nestedCollection;
		}

	});

	/**
	 * The ItemModel. This represents a single Todo item.
	 * @class ItemModel
	 * @constructor
	 */

	 namespace('Todo.Item.Model');
	 Todo.Item.Model = Backbone.Model.extend({
	 	
	 	defaults: {
	 		title: 'New Todo Item',
	 		description: '',
	 		date: null,
	 		incomplete: true
	 	},

	 	initialize: function () {
	 		this.set('date', (new Date()).getTime());
	 	}

	 });

	/**
	 * The ItemView. This is the view for a single todo item.
	 * @class ItemView
	 * @constructor
	 */

	 namespace('Todo.Item.View');
	 Todo.Item.View = Backbone.View.extend({
	 	
	 	tagName: 'li',

	 	tpl: Handlebars.compile(document.getElementById('todo-item-template').innerHTML),

	 	events: {
	 		'click .icon-remove': 'remove',
	 		'click .icon-ok': 'complete',
	 		'mouseenter': 'showDescription',
	 		'mouseleave': 'hideDescription',
	 		'click h2': 'editItem',
	 		'click h3': 'editItem'
	 	},

	 	initialize: function () {
	 		_.bindAll(this);
	 		this.model.on('change', this.render, this);
	 		this.model.on('destroy', this.destroy, this);
	 		this.model.on('change:incomplete', this.setState, this);
	 	},

	 	showDescription: function (e) {
	 		Todo.EventBus.trigger('show-description', this.model);
	 	},

	 	hideDescription: function (e) {
	 		Todo.EventBus.trigger('hide-description');
	 	},

	 	render: function () {
	 		var ctx, html;
	 		ctx = this.model.toJSON();
	 		html = this.tpl(ctx);
	 		this.$el.html(html);
	 		return this;
	 	},

	 	editItem: function (e) {
	 		Todo.EventBus.trigger('edit-todo', this.model);
	 	},

	 	remove: function (e) {
	 		this.model.destroy();
	 		Todo.EventBus.trigger('hide-description');
	 		e.preventDefault();
	 	},

	 	complete: function (e) {
	 		this.model.set('incomplete', false);
	 		e.preventDefault();
	 	},

	 	setState: function (e) {
	 		if(this.model.get('incomplete') === false) {
	 			this.$el.addClass('complete');
	 		}
	 	},

	 	destroy: function (model) {
	 		this.$el.remove();
	 	}

	 });

	/**
	 * The ItemCollection. This will contain all of our Todo Models.
	 * @class ItemCollection
	 * @constructor
	 */

	 namespace('Todo.Item.Collection');
	 Todo.Item.Collection = Backbone.Collection.extend({

	 	model: Todo.Item.Model,

	 	comparator: function () {
	 		return +this.get('date');
	 	}

	 });

	/**
	 * The PanelView. The panel where Todos are edited and created.
	 * @class PanelView
	 * @constructor
	 */

	namespace('Todo.Panel.View');
	Todo.Panel.View = Backbone.View.extend({
		
		el: "#todo-panel",
		
		tpl: Handlebars.compile(document.getElementById('todo-panel-template').innerHTML),

		item: null,

		events: {
			'click button': 'save'
		},
		
		initialize: function () {
			_.bindAll(this);
			this.model.todos.on('add', this.exposePanel, this);
			Todo.EventBus.on('edit-todo', this.exposePanel, this);
			Todo.EventBus.on('peek-panel', this.peekPanel, this);
			Todo.EventBus.on('hide-panel', this.hidePanel, this);
		},

		render: function (model) {
			var ctx, el;
			ctx = model.toJSON();
			el = this.tpl(ctx);
			this.$el.html(el);
			this.title = this.$('[name="title"]');
			this.description = this.$('[name="description"]');
		},

		peekPanel: function () {
			if(this.$el.hasClass('exposed')) return;
			this.$el.addClass('peek');
		},

		hidePanel: function () {
			if(this.$el.hasClass('exposed')) return;
			this.item = null;
			this.$el.removeClass('exposed');
			this.$el.removeClass('peek');
		},

		exposePanel: function (model) {
			this.item = model;
			this.render(model);
			this.$el.addClass('exposed');
		},

		save: function (e) {
			var title, description;

			title = this.title.val();
			description = this.description.val();
			if(title === '' || title.match(/^\s+$/)) {
				return false;
			}
			this.item.set('title', title);
			this.item.set('description', description);
			this.$el.removeClass('peek');
			this.$el.removeClass('exposed');
			this.item = null;
			e.preventDefault();
		}
	});

	/**
	 * The ListView. The list of all the todo items.
	 * @class ListView
	 * @constructor
	 */

	namespace('Todo.List.View');
	Todo.List.View = Backbone.View.extend({

		el: '#todo-list',

		initialize: function () {
			_.bindAll(this);
			this.model.todos.on('add', this.addOne, this);
			this.model.todos.on('reset', this.addAll, this);
			Handlebars.registerHelper('formatDate', this.formatDate);
		},

		addOne: function (model) {
			var view, el;
			view = new Todo.Item.View({
				model: model
			});
			el = view.render().$el;
			this.$el.append(el);
		},

		addAll: function (collection) {
			collection.each(this.addOne);
		},

		formatDate: function (date) {
			var months, month, day, year;
			months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			date = new Date(date);
			month = months[date.getMonth()];
			day = date.getDay().toString();
			year = date.getFullYear().toString();
			return month + ' ' + day + ', ' + year;
		}

	});

	/**
	 * The DescriptionView. This displays the description of the item
	 * that the user is currently hovering over.
	 * @class DescriptionView
	 * @constructor
	 */

	namespace('Todo.Description.View');
	Todo.Description.View = Backbone.View.extend({

		el: '#todo-description',

		tpl: Handlebars.compile(document.getElementById('todo-description-template').innerHTML),

		initialize: function () {
			_.bindAll(this);
			Todo.EventBus.on('show-description', this.showDescription, this);
			Todo.EventBus.on('hide-description', this.hideDescription, this);
		},

		showDescription: function (model) {
			var ctx, html;
			ctx = model.toJSON();
			html = this.tpl(ctx);
			this.$el.html(html);
			return this;
		},

		hideDescription: function () {
			this.$el.html('');
		}

	});

	/**
	 * The OverviewView. Displays the status of all todos.
	 * @class OverviewView
	 * @constructor
	 */

	namespace('Todo.OverviewView.View');
	Todo.OverviewView.View = Backbone.View.extend({

		el: '#todo-overview',

		tpl: Handlebars.compile(document.getElementById('todo-overview-template').innerHTML),

		initialize: function () {
			_.bindAll(this);
			Handlebars.registerHelper('getTotal', this.getTotal);
			Handlebars.registerHelper('getComplete', this.getComplete);
			this.model.todos.on('change', this.render, this);
			this.model.todos.on('add', this.render, this);
			this.model.todos.on('remove', this.render, this);
			this.render();
		},

		getTotal: function (ctx) {
			return this.model.todos.length.toString();
		},

		getComplete: function (ctx) {
			var todos, completed;
			completed = 0;
			_.each(this.model.todos.pluck('incomplete'), function(item) {
				if(item === false) {
					completed++;
				}
			});
			return completed.toString();
		},

		render: function () {
			var ctx, html;
			ctx = this.model.toJSON();
			html = this.tpl(ctx);
			this.$el.html(html);
			return this;
		}

	});

	/**
	 * The application bootstrap.
	 */

	 var application = new Todo.App.View({
	 	model: new Todo.App.Model()
	 });

})();