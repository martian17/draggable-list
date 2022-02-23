let dragMgr = function(elem, start, move, end) {
    elem.on("mousedown", (e) => {
        start(e.pageX, e.pageY, e);
        let onmove = (e) => {
            //console.log(e.pageY);
            move(e.pageX, e.pageY, e);
        };
        let onend = (e) => {
            window.removeEventListener("mousemove",onmove);
            window.removeEventListener("mouseup",onend);
            end(e);
        };
        window.addEventListener("mousemove", onmove);
        window.addEventListener("mouseup", onend);
    });
    elem.on("touchstart", (e) => {
        start(e.touches[0].pageX, e.touches[0].pageY, e);
        let onmove = (e) => {
            move(e.touches[0].pageX, e.touches[0].pageY, e);
        };
        let onend = (e) => {
            window.removeEventListener("touchmove",onmove);
            window.removeEventListener("touchend",onend);
            end(e);
        };
        window.addEventListener("touchmove", onmove);
        window.addEventListener("touchend", onend);
    });
};



class OrderedListItem extends ELEM { //always sandwiched between shadows
    static popups = (() => {
        let popups = new ELEM("div",0,0,"style:height:0px;position:absolute;top:0px;left:0px;");
        document.body.appendChild(popups.e);
        return popups;
    })();
    //window wrapper
    static ewindow = new(function() {
        this.on = function(evt, cb) {
            window.addEventListener(evt, cb);
            return {
                remove: () => {
                    window.removeEventListener(evt, cb);
                }
            };
        }
    })();
    static instances = new WeakMap();
    shadow;
    rect;
    constructor() {
        super("div", "class:list-item");
        //whenever it's constructed, add the div to the static weak map
        this.constructor.instances.set(this.e, this);
        let popups = this.constructor.popups;
        let ewindow = this.constructor.ewindow;
        let that = this;
        let label = this.add("div", "class:label");
        let handle = this.add("div", "class:handle");
        range(0, 3).map(i => handle.add("div"));
        this.label = label;
        this.handle = handle;

        //unified events for touch and mouse
        dragMgr(handle,
            //drag start
            (x, y, e) => {
                e.preventDefault();
                let rect = that.e.getBoundingClientRect();
                that.shadow = that.getPrev();
                that.shadow.expandInstant(rect.height);
                that.getNext().remove(); //removing the next shadow
                that.rect = rect;
                
                console.log(window.scrollY);
                that.remove();
                popups.add(that);
                console.log(rect.y,window.scrollY,y);
                console.log(rect.y+window.scrollY-y);
                that.style(`
                    position:absolute;
                    pointer-events:none;
                    width:${rect.width}px;
                    height:${rect.height}px;
                    transform:translate(${rect.x+window.scrollX-x}px, ${rect.y+window.scrollY-y}px);
                    margin:0px;
                    top:${y}px;
                    left:${x}px;
                    z-index:1;
                `);
            },
            //drag move
            (x, y, e) => {
                that.style(`
                    top:${y}px;
                    left:${x}px;
                `);
                let target = that.instanceFromPoint(x, y);
                if (!target) return; //no underlying item
                //processing the underlying item
                let rect = target.e.getBoundingClientRect();
                let h = rect.height;
                let ly = y - rect.y - window.scrollY;
                let r = ly / h;
                let shadow;
                if (r < 0.5) {
                    shadow = target.getPrev();
                } else {
                    shadow = target.getNext();
                }
                if (shadow === that.shadow) return; //same old shadow
                //transition thing
                let items = target.parent.children.toArray().filter(c => c instanceof OrderedListItem);
                items.map(pre_transition);
                that.shadow.collapse();
                that.shadow = shadow;
                shadow.expand(that.rect.height);
                items.map(post_transition);

            },
            //drag end
            (e) => {
                let shadow = that.shadow;
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
                that.shadow = null;
                that.rect = null;
            }
        );
    }

    instanceFromPoint(x, y) {
        x -= window.scrollX;
        y -= window.scrollY;
        let map = this.constructor.instances;
        let elem = document.elementFromPoint(x, y);
        let instance = undefined;
        while (elem !== null) {
            if (instance = map.get(elem)) {
                break;
            }
            elem = elem.parentNode;
        }
        if (!instance) return null;
        return instance;
    }

};

class OrderedListShadow extends ELEM {
    transition = 100;
    height = 0;
    margin = 5; //0em or whatever
    baseMargin = 0;
    baseHeight = 0;
    animations = [];
    constructor() {
        super("div", "class:shadow");
    }
    interpolate(r) {
        //just some ordinary interpolation function
        return r;
    }
    addAnimation(direction, h0, m0, duration) { //height and margin are in that of the natural state
        let animations = this.animations;
        animations.push({
            direction,
            h0,
            m0,
            duration
        });
        if (animations.length !== 1) return; //already an animation running

        let that = this;
        let animationCB = function(t) {
            let h = that.baseHeight;
            let m = that.baseMargin;
            let validUntil = 0; //index until which the time has ran out and the animation has ended
            for (let i = 0; i < animations.length; i++) {
                let a = animations[i];
                if (!a.start) a.start = t; //initialization after the first encounter
                let dt = t - a.start;
                let r = dt / a.duration;
                if (r >= 1) { //animation part end
                    validUntil = i + 1;
                    r = 1;
                    if (direction === 1) {
                        that.baseHeight = a.h0;
                        that.baseMargin = a.m0;
                    } else {
                        that.baseHeight = 0;
                        that.baseMargin = 0;
                    }
                }
                r = that.interpolate(r);
                //direction positive: expanding into h0 m0
                //direction negative: collapsing from h0 m0
                h += a.direction * a.h0 * r;
                m += a.direction * a.m0 * r;
            }
            animations.splice(0, validUntil);
            that.setState(h, m);
            if (animations.length !== 0) {
                requestAnimationFrame(animationCB);
            } else if (that.inserting) {
                //animation has all but ended
                let item = that.inserting;
                that.inserting = false;
                that.parent.insertBefore(item, that);
                that.parent.insertBefore(new OrderedListShadow(), item);
            }
        };
        requestAnimationFrame(animationCB);
    }
    expand(h) { //they need to laternate
        this.height = h;
        this.setState(h, 10);
        //this.addAnimation(1,h,this.margin,this.duration);
    }
    collapse() {
        this.height = 0;
        this.setState(0, 0);
        //this.addAnimation(-1,this.height,this.margin,this.duration);
    }
    expandInstant(h) {
        this.height = h;
        this.setState(h, 10);
        /*this.baseHeight = h;
        this.baseMargin = this.margin;
        this.setState(h,this.margin);*/
    }
    setState(h, m) {
        this.style(`height:${h}px;margin-top:${m}px;margin-bottom:${m}px;`);
    }
    insert(item) {
        this.collapse();
        this.parent.insertBefore(item, this);
        this.parent.insertBefore(new OrderedListShadow(), item);
    }
};


class OrderedList extends ELEM {
    constructor() {
        super("div", "class:ordered-list");
        //always comes with one shadow
        super.add(new OrderedListShadow());
    }
    add(item) {
        super.add(item);
        super.add(new OrderedListShadow()); //shadow comes after the said item
    }
};