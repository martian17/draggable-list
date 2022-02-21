let range = function(s,e){
    let arr = [];
    for(let i = s; i < e; i++){
        arr.push(i);
    }
    return arr;
};

let main = async function(){
    let list = new OrderedList();
    for(let i = 0; i < 10; i++){
        let item = new OrderedListItem();
        item.label.setInner(`item ${i}`);
        list.add(item);
    }
    let body = new ELEM(document.body);
    //let body = new ELEM(document.body);
    body.add(list);
};

main();