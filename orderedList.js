//global context variable
let dragging = false;//global object pointing to the object in dragging


class OrderedListItem extends ELEM{//always sandwiched between shadows
    static popups = (()=>{
        let popups = new ELEM("div");
        document.body.appendChild(popups.e);
        return popups;
    })();
    //window wrapper
    static ewindow = new (function(){
        this.on = function(evt,cb){
            window.addEventListener(evt,cb);
            return {
                remove:()=>{
                    window.removeEventListener(evt,cb);
                }
            };
        }
    })();
    constructor(){
        super("div","class:list-item");
        let popups = this.constructor.popups;
        let ewindow = this.constructor.ewindow;
        let that = this;
        let label = this.add("div","class:label");
        let handle = this.add("div","class:handle");
        range(0,3).map(i=>handle.add("div"));
        this.label = label;
        this.handle = handle;
        [["mousedown","mousemove","mouseup"],["touchstart","touchmove","touchend"]].map(([movestart,moveduring,moveend])=>{
            handle.on(movestart,(e)=>{
                e.preventDefault();
                let rect = that.e.getBoundingClientRect();
                let homeShadow = that.getPrev();
                homeShadow.expandInstant(rect.height);
                that.getNext().remove();//removing the next shadow
                
                that.remove();
                popups.add(that);
                that.style(`
                    position:absolute;
                    pointer-events:none;
                    width:${rect.width}px;
                    height:${rect.height}px;
                    transform:translate(${rect.x-e.pageX}px, ${rect.y-e.pageY}px);
                    margin:0px;
                    top:${e.pageY}px;
                    left:${e.pageX}px;
                    z-index:1;
                `);
                dragging = {
                    target:that,
                    rect:rect,
                    shadow:homeShadow
                };
                
                let moveListener = ewindow.on(moveduring,(e)=>{
                    e.preventDefault();
                    that.style(`
                        top:${e.pageY}px;
                        left:${e.pageX}px;
                    `);
                });
                let upListener = ewindow.on(moveend,(e)=>{
                    e.preventDefault();
                    moveListener.remove();
                    upListener.remove();
                    let shadow = dragging.shadow || homeShadow;
                    dragging = false;
                    that.style(`
                        position:static;
                        pointer-events:auto;
                        width:auto;
                        height:auto;
                        transform:none;
                        z-index:0;
                    `);
                    that.e.style.margin = null;
                    shadow.insert(that);
                });
            });
        });
        this.on("mousemove",(e)=>{
            if(!dragging)return;
            if(!(dragging.target instanceof OrderedListItem))return;
            //determine if the cursor is on the top side or the bottom side of the elem
            let box = that.e.getBoundingClientRect();
            let h = box.height;
            let ly = e.pageY-box.y;
            let r = ly/h;
            let shadow;
            if(r < 0.5){
                shadow = that.getPrev();
            }else{
                shadow = that.getNext();
            }
            if(shadow === dragging.shadow)return;//same old shadow
            //transition thing
            let items = this.parent.children.toArray().filter(c=>c instanceof OrderedListItem);
            items.map(pre_transition);
            dragging.shadow.collapse();
            dragging.shadow = shadow
            shadow.expand(dragging.rect.height);
            items.map(post_transition);
            //pre_transition();
        });
    }
};

class OrderedListShadow extends ELEM{
    transition = 100;
    height = 0;
    margin = 5;//0em or whatever
    baseMargin = 0;
    baseHeight = 0;
    animations = [];
    constructor(){
        super("div","class:shadow");
    }
    interpolate(r){
        //just some ordinary interpolation function
        return r;
    }
    addAnimation(direction,h0,m0,duration){//ehight and margin are in that of the natural state
        let animations = this.animations;
        animations.push({direction,h0,m0,duration});
        if(animations.length !== 1)return;//already an animation running
        
        let that = this;
        let animationCB = function(t){
            let h = that.baseHeight;
            let m = that.baseMargin;
            let validUntil = 0;//index until which the time has ran out and the animation has ended
            for(let i = 0; i < animations.length; i++){
                let a = animations[i];
                if(!a.start)a.start = t;//initialization after the first encounter
                let dt = t-a.start;
                let r = dt/a.duration;
                if(r >= 1){//animation part end
                    validUntil = i+1;
                    r = 1;
                    if(direction === 1){
                        that.baseHeight = a.h0;
                        that.baseMargin = a.m0;
                    }else{
                        that.baseHeight = 0;
                        that.baseMargin = 0;
                    }
                }
                r = that.interpolate(r);
                //direction positive: expanding into h0 m0
                //direction negative: collapsing from h0 m0
                h += a.direction*a.h0*r;
                m += a.direction*a.m0*r;
            }
            animations.splice(0,validUntil);
            that.setState(h,m);
            if(animations.length !== 0){
                requestAnimationFrame(animationCB);
            }else if(that.inserting){
                //animation has all but ended
                let item = that.inserting;
                that.inserting = false;
                that.parent.insertBefore(item,that);
                that.parent.insertBefore(new OrderedListShadow(),item);
            }
        };
        requestAnimationFrame(animationCB);
    }
    expand(h){//they need to laternate
        this.height = h;
        this.setState(h,10);
        //this.addAnimation(1,h,this.margin,this.duration);
    }
    collapse(){
        this.height = 0;
        this.setState(0,0);
        //this.addAnimation(-1,this.height,this.margin,this.duration);
    }
    expandInstant(h){
        this.height = h;
        this.setState(h,10);
        /*this.baseHeight = h;
        this.baseMargin = this.margin;
        this.setState(h,this.margin);*/
    }
    setState(h,m){
        this.style(`height:${h}px;margin-top:${m}px;margin-bottom:${m}px;`);
    }
    insert(item){
        this.collapse();
        this.parent.insertBefore(item,this);
        this.parent.insertBefore(new OrderedListShadow(),item);
    }
};


class OrderedList extends ELEM{
    constructor(){
        super("div","class:ordered-list");
        //always comes with one shadow
        super.add(new OrderedListShadow());
    }
    add(item){
        super.add(item);
        super.add(new OrderedListShadow());//shadow comes after the said item
    }
};


