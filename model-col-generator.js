/*define([
    'jquery',
    'underscore',
    'backbone',
    'backgrid',
    'backgrid_select_all'
],
*/


(function (root, factory) {

    // Set up Backbone appropriately for the environment. Start with AMD.
    if (typeof define === 'function' && define.amd) {
        console.log('amd');
        define(['jquery',
        'underscore',
        'backbone',
        'backgrid',
        'backgrid_select_all'],
        function ($, _, Backbone, Backgrid, BGSA, exports) {
            // Export global even in AMD case in case this script is loaded with
            // others that may still expect a global Backbone.
            var Retour = factory(root, exports, $, _, Backbone, Backgrid, BGSA);
            console.log(Retour);
            return Retour;
        });

        // Next for Node.js or CommonJS. jQuery may not be needed as a module.
    } else if (typeof exports !== 'undefined') {
        var $ = require('jquery');
        var _ = require('underscore');
        var Backbone = require('backbone');
        var Backgrid = require('backgrid');
        var BGSA = require('backgrid-select-all');
        factory(root, exports, $, _, Backbone, Backgrid, BGSA);

        // Finally, as a browser global.
    } else {
        //TODO
        //root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
    }

}
(this,

function (root, colGene, $, _, Backbone, Backgrid, BGSA) {
    'use strict';
    return Backbone.Model.extend({

        /*
        {
            name: 'age',
            label: 'AGE',
            editable: false,
            cell: 'string',
            headerCell: null,        }, {*/

        initialize: function(options){
            this.checkedColl=options.checkedColl;
            this.getHeaderCell();


            if(options.paginable){
                Backgrid.Column.prototype.defaults.headerCell = this.hc;
            }

           
                this.columns= new Backgrid.Columns();
                this.columns.url=options.url;
                this.columns.fetch({reset: true, data: {'checked' : this.checkedColl}});


        },

        checkedColl: function(){
            
        },


        getHeaderCell: function(){
            this.hc=Backgrid.HeaderCell.extend({
                onClick: function (e) {
                    e.preventDefault();
                    var that=this;
                    var column = this.column;
                    var collection = this.collection;
                    var sortCriteria = (collection.sortCriteria && typeof collection.sortCriteria.id === 'undefined') ? collection.sortCriteria : {};
                    /*
                    var sortCriteria = {};

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
                    
                    */
                    switch(column.get('direction')){
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
                    
                    var tmp= this.column.attributes.name;

                    if(!Object.keys(sortCriteria).length > 0)
                        collection.sortCriteria[tmp] = 'asc';
                    
                    collection.sortCriteria = sortCriteria;
                    console.log(this.collection);
                    collection.fetch({reset: true});
                },
            });
        },








    });
}));
