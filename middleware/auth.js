const authenticated = (req,res,next)=>{
    if(req.session.user){
        next();
    }else{
        res.status(401).send({msg:"Not authenticated",status:"fail"});
    }
}

module.exports = {
    authenticated
}