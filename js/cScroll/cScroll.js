
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
                scrollbarSize:20, // in pixels
                inside:true,
                sideOffset:0,

                trackMargin:{ top:2 , bottom:2 },
                thumbMargin:{ top:2 , bottom:2 },

                thumbMinLength:40,

                startLength:20,
                endLength:20,

                clickRatio:1.75
            },
            y:{
                // side:"right",
                scrollbarSize:20, // in pixels
                inside:true,
                sideOffset:0,

                trackMargin:{ left:2 , right:2 },
                thumbMargin:{ left:2 , right:2 },

                thumbMinLength:40,

                startLength:20,
                endLength:20,

                clickRatio:1.75
            },

            wheelEnabled:true,
            wheelSpeed:20,
            wheelLock:false,
            allowedOverWheelCount:20,

            touchEnabled:true,

            cornerEnabled:true,
            flatOutAxis:'',
            cornerPosition:"", //"top right",
            


            zoomEnabled:true
            
        };

        // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

        function Plugin( $container , options ){

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // OBJECT VARIABLE DEFINES
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            var self = this; // create ourselves object and contian all information in here.
            self.options = {}; // create option container where all important variables will be kept
            self.options.wheelTimeout = undefined;

            self.scrollbars = []; // this array will hold the scroll bars ( X and/or Y )

            self.mousePosition = {
                "x":0,
                "y":0
            };

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
                if( isDef(axis) ) name += " " + name + attrs[axis].toUpperCase();
                return name;
            }

            function createDiv( elClass , elContainer , axis ){
                return $("<div />").addClass( constructClassName( self.options.theme , capitalizeFirstChar(elClass) , axis ) ).appendTo( elContainer );
            }

            function updateOptions( values ){
                $.extend( true , self.options , defaults , values );
            }

            function isVerticalValue( val ){
                if( val == attrs[T] || val == attrs[B] ) return true;
                return false;
            }

            function isHorizontalValue( val ){
                if( val == attrs[L] || val == attrs[R] ) return true;
                return false;
            }

            function removePositionCss( $el ){
                $el
                    .css( attrs[T] , '' )  // top
                    .css( attrs[R] , '' )  // right
                    .css( attrs[B] , '' )  // bottom
                    .css( attrs[L] , '' ); // left
                }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // CORNER OBJECT
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            var Corner = function(){
                this.options = {};

                this.$corner = null;
                this.parentScrollbar = null;

                this.update();
            }

            Corner.prototype.update = function(){
                if( this.isEnabled() ){
                    if( this.whichScrollbarToAdd() != this.parentScrollbar ){
                        this.create();
                        this.setCss();
                    }
                }else{
                    this.destroy();
                }
            }

            Corner.prototype.isEnabled = function(){
                return self.options.cornerEnabled;
            }

            Corner.prototype.defaultSideName = function( axis , val ){
                return isScrollbarExists(axis) ? getScrollbar(axis).getTransverseSideName() : attrs[val];
            }

            Corner.prototype.sideNameHelper = function( axis , val ){
                var s = val , ss;
                if( isScrollbarExists(axis) && ( ss = getScrollbar(axis).getTransverseSideName() ) != val ) s = ss;
                return s;
            }

            Corner.prototype.getXSideName = function(){
                var side = this.defaultSideName( Y , R ); // , me = this;
                if( isDef( self.options.cornerPosition ) ){
                    $.each( self.options.cornerPosition.split(' ') , function( i , val ){
                        if( isHorizontalValue( val ) ) side = val; // me.sideNameHelper( Y , val );
                    });
                }
                return side;    
            }

            Corner.prototype.getYSideName = function(){
                var side = this.defaultSideName( X , T ); // , me = this;
                if( isDef( self.options.cornerPosition ) ){
                    $.each( self.options.cornerPosition.split(' ') , function( i , val ){
                        if( isVerticalValue( val ) ) side = val; //  me.sideNameHelper( X , val );
                    });
                }
                return side;
            }

            Corner.prototype.getXPosition = function(){
                return 0;
            }

            Corner.prototype.getYPosition = function(){
                return 0;
            }

            Corner.prototype.sizeHelper = function(){
                if( isScrollbarExists(Y) ) return getScrollbar(Y).getScrollbarTransverseSize();
                if( isScrollbarExists(X) ) return getScrollbar(X).getScrollbarTransverseSize();
                return 0;
            }

            Corner.prototype.getXSize = function(){
                if( isDualAxis() && isBothAxisExists() ) return getScrollbar(Y).getScrollbarTransverseSize();
                return this.sizeHelper();
            }

            Corner.prototype.getYSize = function(){
                if( isDualAxis() && isBothAxisExists() ) return getScrollbar(X).getScrollbarTransverseSize();
                return this.sizeHelper();
            }

            Corner.prototype.whichScrollbarToAdd = function(){
                if( isDualAxis() && isBothAxisVisible() ){
                    switch( self.options.flatOutAxis ){
                        case attrs[X]:
                            return Y;
                        case attrs[Y]:
                            return X;
                        default:
                            if( isBothAxisOutside() || isBothAxisInside() ) return Y;
                            else if( isScrollbarExists(X) && !getScrollbar(X).isInside() ) return X;
                            else return Y;
                    }
                }else{
                    if( isScrollbarExists(X) && !getScrollbar(X).isDisplayNone() ) return X;
                    if( isScrollbarExists(Y) && !getScrollbar(Y).isDisplayNone() ) return Y;
                }
                return null;
            }

            Corner.prototype.create = function(){
                var axis = this.whichScrollbarToAdd();
                this.destroy();
                if( isDef(axis) && isScrollbarExists( axis ) ){
                    this.$corner = createDiv( "Corner" , getScrollbar( axis ).$scrollbar , axis );
                    this.parentScrollbar = axis;
                }
            }

            Corner.prototype.destroy = function(){
                if( isDef( this.$corner ) ) this.$corner.remove();
            }

            Corner.prototype.setCss = function(){
                removePositionCss( this.$corner );
                this.$corner
                .css( attrs[W] , this.getXSize() )
                .css( attrs[H] , this.getYSize() )
                .css( this.getXSideName() , this.getXPosition() )
                .css( this.getYSideName() , this.getYPosition() );
            } 

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // SCROLLBAR UTILITIES
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

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

            function removeScrollbar( axis ){
                if( ( axis == attrs[X] || axis == X ) && isScrollbarExists(X) ){
                    self.scrollbars[X].destroy();
                    self.scrollbars.splice( X , 1 );
                }else if( ( axis == attrs[Y] || axis == Y ) && isScrollbarExists(Y) ){
                    self.scrollbars[Y].destroy();
                    self.scrollbars.splice( Y , 1 );
                }
            }

            function updateScrollbars(){
                addScrollbar( self.options.axis );
                $.each( self.scrollbars , function( i , val ){
                    if( isDef( val ) && val.axis == Y && self.options.axis == attrs[X] ) removeScrollbar(Y);
                    if( isDef( val ) && val.axis == X && self.options.axis == attrs[Y] ) removeScrollbar(X);
                });
                $.each( self.scrollbars , function( i , val ){
                    if( isDef( val ) ) val.update();
                });
            }

            function isDualAxis(){
                if( self.options.axis == X || self.options.axis == attrs[X] || self.options.axis == Y || self.options.axis == attrs[Y] ) return false;
                return true;
            }

            function isBothAxisExists(){
                if( isDualAxis() && isScrollbarExists(X) && isScrollbarExists(Y) ) return true;
                return false;
            }

            function isBothAxisInside(){
                if( isBothAxisExists() && getScrollbar(X).isInside() && getScrollbar(Y).isInside() ) return true;
                return false;
            }

            function isBothAxisOutside(){
                if( isBothAxisExists() && !getScrollbar(X).isInside() && !getScrollbar(Y).isInside() ) return true;
                return false;
            }

            function isBothAxisVisible(){
                if( isBothAxisExists() && !getScrollbar(X).isDisplayNone() && !getScrollbar(Y).isDisplayNone() ) return true;
                return false;
            }

            function jumpX( distance ){
                if( isScrollbarExists(X) ){
                    getScrollbar(X).jumpToContentPosition( getScrollbar(X).position.contentPosition + distance );
                }
            }

            function jumpY( distance ){
                if( isScrollbarExists(Y) ){
                    getScrollbar(Ys).jumpToContentPosition( getScrollbar(Y).position.contentPosition + distance );
                }    
            }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // SCROLLBAR OBJECT
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            var Scrollbar = function( axis ){
                this.axis = axis;
                this.options = {};

                this.status = {
                    inside: false, // is pointer device inside the $scrollbar container ?
                    animated: false, // is any scrollbar animation in progress ?
                    hovered: false // is the scrollbar in hovered state ?
                };

                this.position = {
                    contentPosition: 0,
                    thumbPosition: 0,
                    mousePosition: 0
                }

                this.scrollbarDragEvent = {
                    thumbClicked: false,
                    trackClicked: false,
                    started: false
                }

                this.arrows = {
                    startInterval: undefined,
                    endInterval: undefined
                }

                this.wheel = {
                    overWheel:0
                };

                this.$scrollbar = createDiv( "Scrollbar" , $container , axis );

                this.$start = createDiv( "Start" , this.$scrollbar , axis );
                this.$track = createDiv( "Track" , this.$scrollbar , axis );
                this.$end   = createDiv( "End"   , this.$scrollbar , axis );

                this.$thumbWrapper = createDiv( "ThumbWrapper" , this.$track );
                this.$thumb = createDiv( "Thumb" , this.$thumbWrapper , axis );

                this.update();
                this.bindEvents();
                
            }

            Scrollbar.prototype.update = function(){

                $.extend( true , this.options , this.options , self.options[ attrs[this.axis] ] );

                if( ! this.isInside() && this.options.sideOffset > 0 ) this.options.sideOffset = 0; // if not inside then we don't allow any side offset...

                this.setVisibility();

                this.setScrollbarCss();
                this.setStartCss();
                this.setTrackCss();
                this.setEndCss();
                this.setThumbCss();

                self.setWrapperCss();
                if( isDef( self.corner ) ) self.corner.update();
                
            }

            Scrollbar.prototype.setScrollbarCss = function(){
                removePositionCss( this.$scrollbar );
                this.$scrollbar
                    .css( this.getTransverseDimensionName() , this.getScrollbarTransverseSize() )
                    .css( this.getTransverseSideName() , this.getScrollbarTransversePosition() )
                    .css( this.getLongitudinalDimensionName() , this.getScrollbarLongitudinalSize() )
                    .css( this.getLongitudinalSideName() , this.getScrollbarLongitudinalPosition() );
            }

            Scrollbar.prototype.setStartCss = function(){
                removePositionCss( this.$start );
                this.$start
                    .css( this.getTransverseDimensionName() , this.getStartTransverseSize() )
                    .css( this.getTransverseSideName() , this.getStartTransversePosition() )
                    .css( this.getLongitudinalDimensionName() , this.getStartLongitudinalSize() )
                    .css( this.getLongitudinalSideName() , this.getStartLongitudinalPosition() );

                var base = pluginName + self.options.theme + "Start" , name;
                var dis = base + "Disabled";
                if( this.isVertical() ) name = base + capitalizeFirstChar( attrs[U] );
                else name = base + capitalizeFirstChar( attrs[L] );

                if( Math.floor( this.position.thumbPosition ) == 0 ) name += " " + dis;
                else this.$start.removeClass( dis );

                this.$start.addClass( name );
            }

            Scrollbar.prototype.setTrackCss = function(){
                removePositionCss( this.$track );
                this.$track
                    .css( this.getTransverseDimensionName() , this.getTrackTransverseSize() )
                    .css( this.getTransverseSideName() , this.getTrackTransversePosition() )
                    .css( this.getLongitudinalDimensionName() , this.getTrackLongitudinalSize() )
                    .css( this.getLongitudinalSideName() , this.getTrackLongitudinalPosition() );
            }

            Scrollbar.prototype.setEndCss = function(){
                removePositionCss( this.$end );
                this.$end
                    .css( this.getTransverseDimensionName() , this.getEndTransverseSize() )
                    .css( this.getTransverseSideName() , this.getEndTransversePosition() )
                    .css( this.getLongitudinalDimensionName() , this.getEndLongitudinalSize() )
                    .css( this.getLongitudinalSideName(true) , this.getEndLongitudinalPosition() );

                var base = pluginName + self.options.theme + "End" , name;
                var dis =  base + "Disabled";
                if( this.isVertical() ) name = base + capitalizeFirstChar( attrs[D] );
                else name = base + capitalizeFirstChar( attrs[R] );

                if( Math.ceil( this.position.thumbPosition ) == ( this.getTrackLongitudinalSize() - this.getThumbLongitudinalSize() ) ) name += " " + dis;
                else this.$end.removeClass( dis );

                this.$end.addClass( name );
            }

            Scrollbar.prototype.setThumbCss = function(){
                removePositionCss( this.$thumb );
                this.$thumb
                    .css( this.getTransverseDimensionName() , this.getThumbTransverseSize() )
                    .css( this.getTransverseSideName() , this.getThumbTransversePosition() )
                    .css( this.getLongitudinalDimensionName() , this.getThumbLongitudinalSize() )
                    .css( this.getLongitudinalSideName() , this.getThumbLongitudinalPosition() );
            }

            Scrollbar.prototype.isDisplayNone = function(){
                return this.$scrollbar.css("display") == "none";
            }

            Scrollbar.prototype.setVisibility = function(){
                if( ! this.hasContentToSroll() && ! this.isDisplayNone() ){
                    this.$scrollbar.css("display", "none");
                    return false;
                }else if( this.hasContentToSroll() && this.isDisplayNone() ){
                    this.$scrollbar.css("display", "block");
                    return true;
                } 
            }

            Scrollbar.prototype.isVertical = function(){
                return this.axis == Y;
            }

            Scrollbar.prototype.isHorizontal = function(){
                return this.axis == X;
            }

            Scrollbar.prototype.isInside = function(){
                return this.options.inside;
            }

            Scrollbar.prototype.getSide = function(){
                if( this.isVertical() ){
                    if( isHorizontalValue( this.options.side ) ) return this.options.side;
                    return attrs[R];
                }else{
                    if( isVerticalValue( this.options.side ) ) return this.options.side;
                    return attrs[B];
                }
            }

            Scrollbar.prototype.getSideOffset = function(){
                return this.options.sideOffset;
            } 

            Scrollbar.prototype.getOther = function(){
                if ( isDualAxis() ) return this.isVertical() ? self.scrollbars[X] : self.scrollbars[Y];
                return null;
            }

            Scrollbar.prototype.isOther = function(){
                if ( isDualAxis() && isDef( this.getOther() ) && this.getOther().hasContentToSroll() ) return true;
                return false;
            }

            Scrollbar.prototype.getTransverseSideName = function(){
                return this.getSide();
            }

            Scrollbar.prototype.getLongitudinalSideName = function( reverse ){
                if( isUndef( reverse ) ) reverse = false;
                return this.isVertical() ? ( reverse ? attrs[B] : attrs[T] ) : ( reverse ? attrs[R] : attrs[L] );
            }

            Scrollbar.prototype.getTransverseDimensionName = function(){
                return this.isVertical() ? attrs[W] : attrs[H];
            }

            Scrollbar.prototype.getLongitudinalDimensionName = function(){
                return this.isVertical() ? attrs[H] : attrs[W];
            }

            Scrollbar.prototype.getScrollbarTransverseSize = function(){
                return this.options.scrollbarSize;
            }

            Scrollbar.prototype.getScrollbarTransversePosition = function(){
                return this.isInside() ? this.getSideOffset() : ( -1 * this.getScrollbarTransverseSize() );
            }

            Scrollbar.prototype.getScrollbarLongitudinalSize = function(){
                var w = $container.width();
                var h = $container.height();
                if( isBothAxisExists() && isBothAxisVisible() ){
                    var os = this.getOther().getScrollbarTransverseSize(); // other size
                    var h_minus = h - os;
                    var w_minus = w - os;
                    var h_plus  = h + os;
                    var w_plus  = w + os;
                    if( !isBothAxisInside() && !isBothAxisOutside() ){
                        return this.isVertical() ? h : w;
                    }else if( isBothAxisInside() ){
                        switch( self.options.flatOutAxis ){
                            case attrs[X]:
                                return this.isVertical() ? h_minus : w;
                            case attrs[Y]:
                            default:
                                return this.isVertical() ? h : w_minus;
                        }
                    }else if( isBothAxisOutside() ){
                        switch( self.options.flatOutAxis ){
                            case attrs[X]:
                                return this.isVertical() ? h : w_plus;
                            case attrs[Y]:
                            default:
                                return this.isVertical() ? h_plus : w;
                        }
                    }
                }else{
                    return this.isVertical() ? h : w;
                }
            }

            Scrollbar.prototype.getScrollbarLongitudinalPosition = function(){
                return 0;
            }

            Scrollbar.prototype.getStartTransverseSize = function(){
                return this.getScrollbarTransverseSize();
            }

            Scrollbar.prototype.getStartTransversePosition = function(){
                return 0;
            }

            Scrollbar.prototype.getStartLongitudinalSize = function(){
                return this.options.startLength;
            }

            Scrollbar.prototype.getStartLongitudinalPosition = function(){
                var pos = 0;
                if( this.isVertical() ){
                    if( isDef( self.corner ) && self.corner.getYSideName() == this.getLongitudinalSideName() && self.corner.parentScrollbar == Y ){
                        pos += self.corner.getYSize() + self.corner.getYPosition();
                    }
                }else{
                    if( isDef( self.corner ) && self.corner.getXSideName() == this.getLongitudinalSideName() && self.corner.parentScrollbar == X ){
                        pos += self.corner.getXSize() + self.corner.getXPosition();
                    }
                }
                return pos;
            }

            Scrollbar.prototype.getEndTransverseSize = function(){
                return this.getScrollbarTransverseSize();
            }

            Scrollbar.prototype.getEndTransversePosition = function(){
                return 0;
            }

            Scrollbar.prototype.getEndLongitudinalSize = function(){
                return this.options.endLength;
            }

            Scrollbar.prototype.getEndLongitudinalPosition = function(){
                var pos = 0;
                if( this.isVertical() ){
                    if( isDef( self.corner ) && self.corner.getYSideName() == this.getLongitudinalSideName(true) && self.corner.parentScrollbar == Y ){
                        pos += self.corner.getYSize() + self.corner.getYPosition();
                    }
                }else{
                    if( isDef( self.corner ) && self.corner.getXSideName() == this.getLongitudinalSideName(true) && self.corner.parentScrollbar == X ){
                        pos += self.corner.getXSize() + self.corner.getXPosition();
                    }
                }
                return pos;
            }

            Scrollbar.prototype.getTrackTransverseSize = function(){
                var trackMargin = 0;
                $.each( this.options.trackMargin , function( i , val ){
                    trackMargin += val;
                });
                return Math.max( 0 , this.getScrollbarTransverseSize() - trackMargin );
            }

            Scrollbar.prototype.getTrackTransversePosition = function(){
                var pos = 0;
                pos += this.options.trackMargin[ this.getTransverseSideName() ];
                return pos;
            }

            Scrollbar.prototype.getTrackLongitudinalSize = function(){
                var s = this.getStartLongitudinalPosition() + this.getStartLongitudinalSize();
                var e = this.getEndLongitudinalPosition() + this.getEndLongitudinalSize();
                return this.getScrollbarLongitudinalSize() - ( s + e );
            }

            Scrollbar.prototype.getTrackLongitudinalPosition = function(){
                return this.getStartLongitudinalPosition() + this.getStartLongitudinalSize();
            }

            Scrollbar.prototype.getThumbTransverseSize = function(){
                var thumbMargin = 0;
                $.each( this.options.thumbMargin , function( i , val ){
                    thumbMargin += val;
                });
                return Math.max( 0 , this.getTrackTransverseSize() - thumbMargin );
            }

            Scrollbar.prototype.getThumbLongitudinalSize = function(){
                return Math.min( this.getTrackLongitudinalSize() , Math.max( this.options.thumbMinLength , Math.floor( this.getTrackLongitudinalSize() * this.contentRatio() ) ) );;
            }

            Scrollbar.prototype.getThumbTransversePosition = function(){
                var pos = 0;
                pos += this.options.thumbMargin[ this.getTransverseSideName() ];
                return pos;
            }

            Scrollbar.prototype.getThumbLongitudinalPosition = function(){
                return this.position.thumbPosition;
            }
            

            // ENGINE CORE --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            Scrollbar.prototype.getViewportLongitudinalSize = function(){
                return self.$viewport[0][ 'offset' + capitalizeFirstChar( this.getLongitudinalDimensionName() ) ];
            }

            Scrollbar.prototype.getContentLongitudinalSize = function(){
                return self.$overview[0][ 'scroll' + capitalizeFirstChar( this.getLongitudinalDimensionName() ) ];
            }

            Scrollbar.prototype.contentRatio = function(){
                return this.getViewportLongitudinalSize() / this.getContentLongitudinalSize();
            }

            Scrollbar.prototype.getTrackRatio = function(){
                return ( this.getContentLongitudinalSize() - this.getViewportLongitudinalSize() ) / ( this.getTrackLongitudinalSize() - this.getThumbLongitudinalSize() );
            }

            Scrollbar.prototype.hasContentToSroll = function(){
                return this.contentRatio() < 1;
            }

            Scrollbar.prototype.triggerMove = function( delta ){
                var direction;
                if( delta < 0 ){
                    direction = this.isVertical() ? attrs[U] : attrs[L];
                }else if( delta > 0 ){
                    direction = this.isVertical() ? attrs[D] : attrs[R];
                }else{
                    return;
                }

                $container.trigger( "move" + capitalizeFirstChar( direction ) );
            }

            Scrollbar.prototype.updatePositionCss = function( thumbPosition , contentPosition ){
                this.$thumb.css( this.getLongitudinalSideName() , thumbPosition || this.position.thumbPosition );
                self.$overview.css( this.getLongitudinalSideName() , -contentPosition || -this.position.contentPosition );
            }

            Scrollbar.prototype.jumpToContentPosition = function( contentPosition ){
                var delta = contentPosition - this.position.contentPosition;

                this.position.contentPosition = Math.min( ( this.getContentLongitudinalSize() - this.getViewportLongitudinalSize() ) , Math.max( 0 , contentPosition ) );
                this.position.thumbPosition = Math.min( ( this.getTrackLongitudinalSize() - this.getThumbLongitudinalSize() ) , this.position.contentPosition / this.getTrackRatio() );
                
                this.updatePositionCss();
                this.setStartCss();
                this.setEndCss();
 
                this.triggerMove( delta );           
            }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            Scrollbar.prototype.destroy = function(){
                this.$scrollbar.remove();
            }

            Scrollbar.prototype.isAtBegin = function(){
                return this.position.contentPosition > 0;
            }

            Scrollbar.prototype.isAtEnd = function(){
                return this.position.contentPosition <= ( this.getContentLongitudinalSize() - this.getViewportLongitudinalSize() ) - 5;
            }

            Scrollbar.prototype.trackBegin = function(){
                return this.$track.offset()[ this.getLongitudinalSideName() ];
            }

            Scrollbar.prototype.trackEnd = function(){
                return this.trackBegin() + this.getTrackLongitudinalSize();
            }

            /*
            var s = this.getStartLongitudinalPosition() + this.getStartLongitudinalSize();
                var e = this.getEndLongitudinalPosition() + this.getEndLongitudinalSize();
                return this.getScrollbarLongitudinalSize() - ( s + e );
            */

            // SCROLLBAR RELATED EVENT HANDLERS --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --

            Scrollbar.prototype.bindEvents = function(){
                var me = this;

                this.$thumb.on( "mousedown" , { "axis" : this.axis } , function( e ){
                    me.start( e , false );
                });

                this.$track.on( "mousedown" ,  { "axis" : this.axis } , function( e ){
                    me.start( e , true );
                });

                this.$start.on( "mousedown" , { "me" : this } , this.startBoxMouseDown );
                this.$end.on( "mousedown" , { "me" : this } , this.endBoxMouseDown );
            }

            Scrollbar.prototype.startBoxMouseDown = function( e ){
                var me = e.data.me;
                if( !isDef( me.arrows.startInterval ) ){
                    $("body").addClass( "cScrollbarNoSelect" );
                    $(document).on( "mouseup" , { "me" : me } , me.startBoxMouseUp );
                    me.jumpToContentPosition( me.position.contentPosition - self.options.wheelSpeed );
                    me.arrows.startInterval = setInterval(function(){ me.jumpToContentPosition( me.position.contentPosition - self.options.wheelSpeed ); } , 400 );
                }
            }

            Scrollbar.prototype.startBoxMouseUp = function( e ){
                var me = e.data.me;
                if( isDef( me.arrows.startInterval ) ){
                    $(document).off( "mouseup" , me.startBoxMouseUp );
                    clearTimeout( me.arrows.startInterval );
                    me.arrows.startInterval = undefined;
                    $("body").removeClass( "cScrollbarNoSelect" );
                }
            }

            Scrollbar.prototype.endBoxMouseDown = function( e ){
                var me = e.data.me;
                if( !isDef( me.arrows.endInterval ) ){
                    $("body").addClass( "cScrollbarNoSelect" );
                    $(document).on( "mouseup" , { "me" : me } , me.endBoxMouseUp );
                    me.jumpToContentPosition( me.position.contentPosition + self.options.wheelSpeed );
                    me.arrows.endInterval = setInterval(function(){ me.jumpToContentPosition( me.position.contentPosition + self.options.wheelSpeed ); } , 400 );
                }
            }

            Scrollbar.prototype.endBoxMouseUp = function( e ){
                var me = e.data.me;
                if( isDef( me.arrows.endInterval ) ){
                    $(document).off( "mouseup" , me.endBoxMouseUp );
                    clearTimeout( me.arrows.endInterval );
                    me.arrows.endInterval = undefined;
                    $("body").removeClass( "cScrollbarNoSelect" );
                }
            }

            Scrollbar.prototype.start = function( e , trackClicked ){

                if( this.hasContentToSroll() ){

                    if( this.scrollbarDragEvent.thumbClicked ) return; // a higher priority drag event has been already stated...

                    $("body").addClass( "cScrollbarNoSelect" );
                    this.scrollbarDragEvent.started = true;

                    if( trackClicked ){

                        this.scrollbarDragEvent.trackClicked = true;
                        this.scrollbarDragEvent.thumbClicked = false;

                        this.position.mousePosition = this.$thumb.offset()[ this.getLongitudinalSideName() ];

                    }else{

                        this.scrollbarDragEvent.trackClicked = false;
                        this.scrollbarDragEvent.thumbClicked = true;

                        this.position.mousePosition = this.isVertical() ? e.pageY : e.pageX;

                    }

                    $(document).on( "mousemove" , { "me" : this } , this.drag );
                    $(document).on( "mouseup"   , { "me" : this } , this.end );
                    //this.$thumb.on( "mouseup"   , { "me" : this } , this.end );
                    //this.$track.on( "mouseup"   , { "me" : this } , this.end );

                    e.data.me = this;
                    this.drag( e , true );
                }

            }

            Scrollbar.prototype.drag = function( e , clickEvent ){

                var me = e.data.me;
                var mousePositionNew = me.isVertical() ? e.pageY : e.pageX;
                var thumbPositionDelta = mousePositionNew - me.position.mousePosition;

                if(
                    me.hasContentToSroll()
                    && ( me.trackBegin() + 2 ) < mousePositionNew
                    && mousePositionNew < ( me.trackEnd() + 2 )
                    && thumbPositionDelta != 0 // to avoid glitchy jumps when click spam on thumb..
                ){

                    if( isDef( clickEvent ) && clickEvent && me.scrollbarDragEvent.trackClicked ){

                        thumbPositionDelta = mousePositionNew - me.position.mousePosition - ( me.getThumbLongitudinalSize() / 2 );
                    
                        // multiply by clickRatio ~ 1.25 ... 2.00
                        var ratio = Math.min( 1 , me.options.clickRatio * Math.abs( thumbPositionDelta ) / me.getTrackLongitudinalSize() );
                        thumbPositionDelta *= ( ratio < 0.25 ) ? 1 : ratio; // avoid very tiny small jumps... go straight to destination.

                    }else if( isDef( clickEvent ) && clickEvent && me.scrollbarDragEvent.thumbClicked ){
                        thumbPositionDelta = 0;
                    }

                    me.position.thumbPosition = Math.min( ( me.getTrackLongitudinalSize() - me.getThumbLongitudinalSize() ) , Math.max( 0 , me.position.thumbPosition + thumbPositionDelta ) );
                    
                    me.jumpToContentPosition( me.position.thumbPosition * me.getTrackRatio() );
                    me.position.mousePosition = mousePositionNew;

                    e.preventDefault();

                }
            }

            Scrollbar.prototype.end = function( e ){
                var me = e.data.me;

                $("body").removeClass( "cScrollbarNoSelect" );

                $(document).off( "mousemove" , me.drag );
                $(document).off( "mouseup" , me.end );
                //me.$thumb.off( "mouseup" , me.end );
                //me.$track.off( "mouseup" , me.end );

                me.scrollbarDragEvent.trackClicked = false;
                me.scrollbarDragEvent.thumbClicked = false;
                me.scrollbarDragEvent.started = false;

                e.preventDefault();
            }

            Scrollbar.prototype.wheelEvent = function( e ){
                if( this.hasContentToSroll() ){

                    var wheelDelta = this.isVertical() ? e.deltaY : -e.deltaX;

                    this.jumpToContentPosition( this.position.contentPosition - ( wheelDelta * self.options.wheelSpeed ) );

                    e = $.event.fix( e );

                    if( self.options.wheelLock || this.isAtBegin() && this.isAtEnd() ){
                        e.preventDefault();
                        this.wheel.overWheel = 0;
                    }else if( Math.abs( this.wheel.overWheel ) < self.options.allowedOverWheelCount ){
                        e.preventDefault();
                        this.wheel.overWheel += wheelDelta;
                    }

                }
            }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---


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

            function bindEvents(){

                self.refreshInterval = setInterval( self.update() , 10000 );

                $container.on( "mousewheel" , wheelEvent );

                if( 'ontouchstart' in window ){
                    $container.on( "touchstart" , touchStartEvent );
                }else if( window.navigator.pointerEnabled ){
                    $container.on( "pointerdown" , touchStartEvent );
                }else if( window.navigator.msPointerEnabled ){ //
                    $container.on( "MSPointerDown" , touchStartEvent );
                }else{
                    // ?? click ??
                }

            }

            function wheelEvent( e ){

                if( ! self.options.wheelEnabled ) return;

                if ( ! isDef( self.options.wheelTimeout ) ){
                    $container.trigger("scrollStart");
                }

                // Execute the scrollEnd event after 400ms the wheel stopped scrolling
                clearTimeout( self.options.wheelTimeout );
                self.options.wheelTimeout = setTimeout(function (){
                    $container.trigger("scrollEnd");
                    self.options.wheelTimeout = undefined;
                } , 400 );

                if( e.deltaX != 0 && e.deltaX != -0 ){
                    if( isScrollbarExists(X) && getScrollbar(X).hasContentToSroll() ){
                        getScrollbar(X).wheelEvent( e );
                    }
                }else if( e.deltaY != 0 && e.deltaY != -0 ){
                    if( isScrollbarExists(Y) && getScrollbar(Y).hasContentToSroll() ){
                        getScrollbar(Y).wheelEvent( e );
                    }
                }
            }

            function touchStartEvent( e ){

                if( ! self.options.touchEnabled ) return;

                $("body").addClass( "cScrollbarNoSelect" );

                self.mousePosition = {
                    'x' : e.pageX || e.originalEvent.touches[0].pageX,
                    "y" : e.pageY || e.originalEvent.touches[0].pageY
                };

                if( 'ontouchstart' in window ){
                    $(document).on( "touchmove"   , touchMoveEvent );
                    $(document).on( "touchcancel" , touchEndEvent );
                    $(document).on( "touchend"    , touchEndEvent );
                }else if( window.navigator.pointerEnabled ){
                    $(document).on( msPointerEvent("pointermove")   , touchMoveEvent );
                    $(document).on( msPointerEvent("pointerup")     , touchEndEvent );
                    $(document).on( msPointerEvent("pointercancel") , touchEndEvent );
                }else if( window.navigator.msPointerEnabled ){
                    $(document).on( msPointerEvent("MSPointerMove")   , touchMoveEvent );
                    $(document).on( msPointerEvent("MSPointerUp")     , touchEndEvent );
                    $(document).on( msPointerEvent("MSPointerCancel") , touchEndEvent );
                }else{
                    // ?? click ??
                }

                e.preventDefault();

            }

            function touchMoveEvent( e ){
                var deltaX = self.mousePosition.x - ( e.pageX || e.originalEvent.touches[0].pageX );
                var deltaY = self.mousePosition.y - ( e.pageY || e.originalEvent.touches[0].pageY );

                if( deltaX ) jumpX( deltaX );
                if( deltaY ) jumpY( deltaY );

                self.mousePosition = {
                    'x' : ( e.pageX || e.originalEvent.touches[0].pageX ),
                    "y" : ( e.pageY || e.originalEvent.touches[0].pageY )
                };

                e.preventDefault();
            }

            function touchEndEvent( e ){

                if( 'ontouchstart' in window ){
                    $(document).off( "touchmove"   , touchMoveEvent );
                    $(document).off( "touchcancel" , touchEndEvent );
                    $(document).off( "touchend"    , touchEndEvent );
                }else if( window.navigator.pointerEnabled ){
                    $(document).off( msPointerEvent("pointermove")   , touchMoveEvent );
                    $(document).off( msPointerEvent("pointerup")     , touchEndEvent );
                    $(document).off( msPointerEvent("pointercancel") , touchEndEvent );
                }else if( window.navigator.msPointerEnabled ){
                    $(document).off( msPointerEvent("MSPointerMove")   , touchMoveEvent );
                    $(document).off( msPointerEvent("MSPointerUp")     , touchEndEvent );
                    $(document).off( msPointerEvent("MSPointerCancel") , touchEndEvent );
                }else{
                    // ?? click ??
                }

                $("body").removeClass( "cScrollbarNoSelect" );

                e.preventDefault();
            }

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // INITIALIZE
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            function cScroll_initialize(){
                $container.addClass( pluginName ); // add the plugin name as a class to the box

                updateOptions( options ); // merge all options ( default , options passed from the constructor ) into the self.options object

                var content; // copy the content to the overview box
                if( ( content = $container.html() ) != "" ) $container.html( "" );
                self.$wrapper =  createDiv( "Wrapper" , $container );
                self.$viewport = createDiv( "Viewport" , self.$wrapper );
                self.$overview = createDiv( "Overview" , self.$viewport ).html( content );

                //self.$corner =  createDiv( "Corner" , $container );

                addScrollbar( self.options.axis );

                self.corner = new Corner();

                self.update();

                bindEvents();

            }

            this.update = function( options ){
                updateOptions( options );
                self.setWrapperCss();
                updateScrollbars();
                $container.trigger("scrollUpdate");
            }

            this.setWrapperCss = function(){
                var w = $container.width();
                var h = $container.height();
                removePositionCss( this.$wrapper );
                $.each( self.scrollbars , function( i , val ){
                    if( isDef( val ) && !val.isDisplayNone() ){
                        if( val.isInside() ){
                            self.$wrapper.css( val.getSide() , val.getScrollbarTransverseSize() );
                            if( val.axis == Y ) w -= val.getScrollbarTransverseSize();
                            if( val.axis == X ) h -= val.getScrollbarTransverseSize();
                        }else{
                            self.$wrapper.css( val.getSide() , 0 );
                        }
                    }
                });
                self.$wrapper
                .css( attrs[W] , w )
                .css( attrs[H] , h );
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