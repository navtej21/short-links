
import { randomInt } from "node:crypto";

// generate a shortCode for the url generation
export  function generateShortCode(length:number=7) :string{


    if (!Number.isInteger(length) || length<3 || length>32){
        throw new Error("length must be an integer between 3 and 32");
    }


    const characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code=""
    for(let i=0;i<length;i++){
        code+=characters.charAt(randomInt(0,characters.length));
    }


    return code;

}


