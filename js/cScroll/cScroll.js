
;
(function( factory ){
        if( typeof define === 'function' && define.amd ){
            define( ['jquery'] , factory );
        }else if( typeof exports === 'object' ){
            module.exports = factory( require("jquery") );
        }else{
            factory( jQuery );
        }
    }
    (function($){
        "use strict";

        // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
        // GLOBAL VARIABLE DEFINES
        // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

        var pluginName = "cScroll";

        // for quick shorthand and space saving let's create a "map" for the commonly used attributes:
        var X = 0,   // x axis
            Y = 1,   // y axis
            W = 2,   // width
            H = 3,   // height
            T = 4,   // top
            B = 5,   // bottom
            L = 6,   // left
            R = 7,   // right
            U = 8,   // up
            D = 9,   // down
            Pa = 10, // padding
            Ma = 11, // margin
            Po = 12; // position

        var attrs = [ "x", "y", "width", "height", "top", "bottom", "left", "right", "up" , "down" , "padding", "margin", "position" ];

        // defaults options:
        var defaults = {

        	theme:"",

            x:{
                // side:"bottom",
                size:50, // in pixels
                inside:true
            },
            y:{
                // side:"right",
                size:50, // in pixels
                inside:true,
            },

            zoomEnabled:true,
            zoomPosition:"top right"
        };

        // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

        function Plugin( $container , options ){

        	// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // OBJECT VARIABLE DEFINES
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

        	var self = this; // create ourselves object and contian all information in here.
        	self.options = {}; // create option container where all important variables will be kept

        	$.extend( true , self.options , defaults , options ); // merge all options ( default , options passed from the constructor ) into the self.options object

        	self.scrollbars = []; // this array will hold the scroll bars ( X and/or Y )


        	// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // COMMON UTILITIES
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            function isUndef( val ){
                if( typeof val === "undefined" || val == null ) return true;
                return false;
            }

            function isDef( val ){
                return !isUndef( val );
            }

            function capitalizeFirstChar( text ){
                return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            }

            function constructClassName( prefix , className , axis ){
                var name = pluginName + prefix + className;
                if( isDef(axis) ) name += " " + name + axis.toUpperCase();
                return name;
            }

            function createDiv( elClass , elContainer , axis ){
                return $("<div />").addClass( constructClassName( self.options.theme , capitalizeFirstChar(elClass) , axis ) ).appendTo( elContainer );
            }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // SCROLLBAR UTILITIES
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            function isDualAxis(){
                if( self.options.axis == X || self.options.axis == Y ) return false;
                return true;
            }

            function getScrollbar( axis ){
                if( axis == Y && isDef( self.scrollbars[Y] ) ) return self.scrollbars[Y];
                if( axis == X && isDef( self.scrollbars[X] ) ) return self.scrollbars[X];
                return null;
            }

            function isScrollbarExists( axis ){
                return isDef( getScrollbar( axis ) );
            }

            function addScrollbar( axis ){
                if( ( axis != attrs[X] && axis != attrs[Y] ) && ( axis != X && axis != Y ) ){ // if we don't recognize the axis as X or Y in any format.. then we say it's X and Y (add both).
                    addScrollbar(X);
                    addScrollbar(Y);
                    return self.scrollbars;
                }
                if( ( axis == attrs[X] || axis == X ) && !isScrollbarExists(X) ) return self.scrollbars[X] = new Scrollbar(X);
                if( ( axis == attrs[Y] || axis == Y ) && !isScrollbarExists(Y) ) return self.scrollbars[Y] = new Scrollbar(Y);
                return self.scrollbars;
            }

            function removeScrollbar(axis) {
                if( ( axis == attrs[X] || axis == X ) && isScrollbarExists(X) ){
                    self.scrollbars[X].destroy();
                    self.scrollbars.splice( X , 1 );
                }else if( ( axis == attrs[Y] || axis == Y ) && isScrollbarExists(Y) ){
                    self.scrollbars[Y].destroy();
                    self.scrollbars.splice( Y , 1 );
                }
            }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // SCROLLBAR OBJECT
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            var Scrollbar = function( axis ){
            	this.axis = axis;

            	this.options = {};

        	}

        	Scrollbar.prototype.isVertical = function() {
                return this.axis == Y;
            }

            Scrollbar.prototype.isHorizontal = function() {
                return this.axis == X;
            }

        	Scrollbar.prototype.getOther = function() {
                if ( isDualAxis() ) return this.isVertical() ? self.scrollbars[X] : self.scrollbars[Y];
                return null;
            }

            Scrollbar.prototype.isOther = function() {
                if ( isDualAxis() && isDef( this.getOther() ) && this.getOther().hasContentToSroll() ) return true;
                return false;
            }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // EVENTS
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            function hasTouch(){
                return 'ontouchstart' in window;
            }

            function hasPointer(){
                return window.PointerEvent || window.MSPointerEvent; // IE10 is prefixed
            }

            function msPointerEvent( pointerEvent ) {
                if( window.PointerEvent && window.navigator.pointerEnabled ) return pointerEvent;
                else if( window.MSPointerEvent && window.navigator.msPointerEnabled ) return 'MSPointer' + pointerEvent.charAt(7).toUpperCase() + pointerEvent.substr(8);
                return "";
            }



        	// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // INITIALIZE
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            function cScroll_initialize(){
            	$container.addClass( pluginName ); // add the plugin name as a class to the box

            	var content; // copy the content to the overview box
            	if( ( content = $container.html() ) != "" ) $container.html( "" );
            	self.$wrapper =  createDiv( "Wrapper" , $container );
            	self.$viewport = createDiv( "Viewport" , self.$wrapper );
            	self.$overview = createDiv( "Overview" , self.$viewport ).html( content );


            }

            this.update = function( options ){
            	$.extend( true , self.options , defaults , options );
            }


            return cScroll_initialize();

        }


        $.fn[pluginName] = function( options ){
            return this.each(function(){
                if( !$.data( this , "plugin_" + pluginName ) ){
                    $.data( this , "plugin_" + pluginName , new Plugin( $(this) , options ) );
                }
            });
        };

    }));