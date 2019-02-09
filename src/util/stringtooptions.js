/**
 * Permet de convertir une chaîne de caractères en objet contenant les options avec leurs valeurs par défaut.
 * @return {Object}
 * @param {String} optionsEnter Options sous forme de chaînes de caractères envoyée à l'API. 
 * @param {Object} defaultOptions Options par défaut, sous la forme d'un objet.
 */
module.exports = function stringToOptions(optionsEnter, defaultOptions) {
  const optionsString = optionsEnter ?? '{}';
  const optionsParam = JSON.parse(optionsString);
  const options = Object.assign(defaultOptions, optionsParam);

  return options;
};
