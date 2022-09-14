const is_blank = function(element) {
    if(element === undefined)
        return true;
    
    if(element === null)
        return true;

    if(element === "")
        return true;
        
    return false;
}
 
const thousandsep = function (x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = { is_blank, thousandsep }