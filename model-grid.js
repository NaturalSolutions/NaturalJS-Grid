define([
    'jquery',
    'underscore',
    'backbone',
    'backbone.radio',
    'backgrid',
    'backbone-paginator',
    'backgrid-paginator',
    './model-col-generator',
], function ($, _, Backbone, Radio, Backgrid, PageColl, Paginator, colGene) {
    'use strict';
    return Backbone.Model.extend({


        /*===================================
        =            Grid module            =
        ===================================*/
        events: {
            // 'click table.backgrid th input': 'checkSelectAll',
        },

        init: false,
        pagingServerSide: true,
        coll: false,
        totalElement: null,
        filterCriteria: {},
        RowType: null,

        initialize: function (options) {
            var _this = this;
            if (options.com) {
                this.com = options.com;
                this.com.addModule(this);
            }

            if (options.rowClicked) {
                var clickFunction = options.rowClicked.clickFunction
                this.RowType = Backgrid.Row.extend({
                    events: {
                        "click": "onClick"
                    },
                    onClick: function () {
                        _this.interaction('rowclicked', {
                            model: this.model,
                            //parent: options.rowClicked.parent
                        });

                    }
                });
                Backbone.on("rowclicked", function (options) {
                    clickFunction(options);
                });
            }

            else {
                if (options.row) {
                    this.RowType = options.row;
                } else {
                    this.RowType = Backgrid.Row;
                }

            }




            this.name = options.name || 'default';
            this.channel = options.channel;
            this.radio = Radio.channel(this.channel);

            if (options.totalElement) {
                this.totalElement = options.totalElement;
            }
            this.radio.comply(this.channel + ':grid:update', this.update, this);

            this.url = options.url;
            this.pageSize = options.pageSize;


            this.pagingServerSide = options.pagingServerSide;
            if (options.columns) {
                this.columns = options.columns;
            } else {
                this.colGene = new colGene({ url: this.url + 'getFields?name=' + this.name, paginable: this.pagingServerSide, checkedColl: options.checkedColl });
                this.columns = this.colGene.columns;
            }

            if (options.collection) {
                this.collection = options.collection;
                this.coll = true;
            }
            else {
                this.initCollectionFromServer();
            }
            if (this.pagingServerSide) {//&& options.columns) {
                this.setHeaderCell();
            }
            if (options.filterCriteria) {
                this.filterCriteria = options.filterCriteria;
            }
            this.initGrid();
            this.eventHandler();
        },

        setHeaderCell: function () {
            var hc = Backgrid.HeaderCell.extend({
                onClick: function (e) {
                    e.preventDefault();
                    var that = this;
                    var column = this.column;
                    var collection = this.collection;
                    var sortCriteria = (collection.sortCriteria && typeof collection.sortCriteria.id === 'undefined') ? collection.sortCriteria : {};
                    switch (column.get('direction')) {
                        case null:
                            column.set('direction', 'ascending');
                            sortCriteria[column.get('name')] = 'asc';
                            break;
                        case 'ascending':
                            column.set('direction', 'descending');
                            sortCriteria[column.get('name')] = 'desc';
                            break;
                        case 'descending':
                            column.set('direction', null);
                            delete sortCriteria[column.get('name')];
                            break;
                        default:
                            break;
                    }
                    var tmp = this.column.attributes.name;
                    if (!Object.keys(sortCriteria).length > 0)
                        collection.sortCriteria[tmp] = 'asc';
                    collection.fetch({ reset: true });
                },
            });
            for (var i = 0; i < this.columns.length; i++) {
                this.columns[i].headerCell = hc;
            };
        },

        initCollectionFromServer: function () {
            if (this.pagingServerSide) {
                this.initCollectionPaginable();
            } else if (this.pageSize) {
                this.initCollectionPaginableClient();
            }
            else {
                this.initCollectionNotPaginable();
            }
        },


        initCollectionPaginable: function () {
            var ctx = this;
            var PageCollection = PageColl.extend({
                sortCriteria: {},
                url: this.url + 'search?name=' + this.name,
                mode: 'server',
                state: {
                    pageSize: this.pageSize
                },
                queryParams: {
                    offset: function () { return (this.state.currentPage - 1) * this.state.pageSize; },
                    criteria: function () {

                        return JSON.stringify(this.searchCriteria);
                    },
                    order_by: function () {
                        var criteria = [];
                        for (var crit in this.sortCriteria) {
                            criteria.push(crit + ':' + this.sortCriteria[crit]);
                        }
                        return JSON.stringify(criteria);
                    },
                },
                fetch: function (options) {
                    var params = {
                        'page': this.state.currentPage,
                        'per_page': this.state.pageSize,
                        'offset': this.queryParams.offset.call(this),
                        'order_by': this.queryParams.order_by.call(this),
                        'criteria': this.queryParams.criteria.call(this),
                    };
                    if (ctx.init) {
                        ctx.updateMap(params);
                    }
                    ctx.init = true;

                    PageColl.prototype.fetch.call(this, options);
                }
            });

            this.collection = new PageCollection();
            this.listenTo(this.collection, "reset", this.affectTotalRecords);
        },

        updateMap: function (params) {
            this.radio.command(this.channel + ':map:update', { params: params });
        },

        initCollectionPaginableClient: function () {
            var PageCollection = PageColl.extend({
                url: this.url + 'search?name=' + this.name,
                mode: 'client',
                state: {
                    pageSize: this.pageSize
                },
                queryParams: {
                    order: function () { },
                    criteria: function () {
                        return JSON.stringify(this.searchCriteria);
                    },
                },
            });

            this.collection = new PageCollection();
        },


        initCollectionNotPaginable: function () {
            this.collection = new Backbone.Collection.extend({
                url: this.url + 'search?name=' + this.name,
            });
        },


        initGrid: function () {
            var tmp = JSON.stringify({ criteria: null });

            this.grid = new Backgrid.Grid({
                row: this.RowType,
                columns: this.columns,
                collection: this.collection
            });
            if (!this.coll) {
                this.collection.searchCriteria = this.filterCriteria;
                this.fetchCollection();
            }

            this.collection.on('change', this.collectionFetched);
        },

        collectionFetched: function () {
            this.affectTotalRecords();
        },

        update: function (args) {
            if (this.pageSize) {
                this.grid.collection.state.currentPage = 1;
                this.grid.collection.searchCriteria = args.filters;
                this.fetchCollection();

            }
            else {
                this.filterCriteria = JSON.stringify(args.filters);
                this.fetchCollection();
            }
        },
        fetchCollection: function () {
            if (this.filterCriteria != null) {
                this.grid.collection.fetch({ reset: true, data: { 'criteria': this.filterCriteria } });
            }
            else {
                this.grid.collection.fetch({ reset: true });
            }
        },
        displayGrid: function () {
            return this.grid.render().el;
        },


        displayPaginator: function () {
            this.paginator = new Backgrid.Extension.Paginator({
                collection: this.collection
            });
            var resultat = this.paginator.render().el;

            return resultat;
        },

        affectTotalRecords: function () {
            if (this.totalElement != null) {
                $('#' + this.totalElement).html(this.paginator.collection.state.totalRecords);
            }
        },

        setTotal: function () {
            this.total = this.paginator.state;
        },

        getTotal: function () {
            this.paginator.render();
            return this.paginator.collection.state.totalRecords;

        },

        eventHandler: function () {
            var self = this;
            this.grid.collection.on('backgrid:edited', function (model) {
                model.save({ patch: model.changed });
            })
        },



        action: function (action, params) {
            switch (action) {
                case 'focus':
                    this.hilight(params);
                    break;
                case 'selection':
                    this.selectOne(params);
                    break;
                case 'selectionMultiple':
                    this.selectMultiple(params);
                    break;
                case 'resetAll':
                    this.clearAll();
                    break;
                case 'filter':
                    this.filter(params);
                    break;
                case 'rowclicked':
                    // Rien � faire
                    break;
                default:
                    console.warn('verify the action name');
                    break;
            }
        },



        interaction: function (action, id) {
            if (this.com) {
                this.com.action(action, id);
            } else {
                this.action(action, id);
            }
        },

        hilight: function () {
        },

        clearAll: function () {
            var coll = new Backbone.Collection();
            coll.reset(this.grid.collection.models);
            for (var i = coll.models.length - 1; i >= 0; i--) {
                coll.models[i].attributes.import = false;
            };
            //to do : iterrate only on checked elements list of (imports == true)
        },

        selectOne: function (id) {
            var model_id = id;
            var coll = new Backbone.Collection();
            coll.reset(this.grid.collection.models);

            model_id = parseInt(model_id);
            var mod = coll.findWhere({ id: model_id });

            if (mod.get('import')) {
                mod.set('import', false);
                mod.trigger("backgrid:select", mod, false);
            } else {
                mod.set('import', true);
                mod.trigger("backgrid:select", mod, true);
            }
        },

        selectMultiple: function (ids) {
            var model_ids = ids, self = this, mod;

            for (var i = 0; i < model_ids.length; i++) {
                mod = this.grid.collection.findWhere({ id: model_ids[i] });
                mod.set('import', true);
                mod.trigger("backgrid:select", mod, true);
            };
        },

        checkSelect: function (e) {
            var id = $(e.target).parent().parent().find('td').html();
            this.interaction('selection', id);
        },

        checkSelectAll: function (e) {
            var ids = _.pluck(this.grid.collection.models, 'id');
            if (!$(e.target).is(':checked')) {
                this.interaction('resetAll', ids);
            } else {
                this.interaction('selectionMultiple', ids);
            }
        },

        focus: function (e) {
            if ($(e.target).is('td')) {
                var tr = $(e.target).parent();
                var id = tr.find('td').first().text();
                this.interaction('focus', id);
            }
        },


        filter: function (args) {
            if (this.coll) {
                // Client Grid Management
                this.grid.collection = args;
                this.grid.body.collection = args;
                this.grid.body.refresh();
            }
            else {
                // Server Grid Management
                this.update({ filters: args });
            }
        },


    });
});
