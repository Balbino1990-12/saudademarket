function slugify(text){
  return String(text).toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
}

module.exports = { slugify };