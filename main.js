let range = function(s,e){
    let arr = [];
    for(let i = s; i < e; i++){
        arr.push(i);
    }
    return arr;
};

let main = async function(){
    let list = new OrderedList();
    for(let i = 0; i < 15; i++){
        let item = new OrderedListItem();
        item.label.setInner(`item ${i}`);
        list.add(item);
    }
    let body = new ELEM(document.body);
    //let body = new ELEM(document.body);
    body.add(list);
    
    /*let errholder = body.add("div");
    window.onerror = function(message, source, lineno, colno, error) {
        console.log("EEE");
        errholder.add("div",0,`${message}<br>${source}<br>${lineno}<br>${colno}<br>${error}`,"background-color:#f001;margin:10px;");
    };*/
    //setTimeout(()=>{throw new Error("EEEEEE")},1000);
};

main();