'use strict';

const express = require('express');
const router = express.Router();
const {User} = require('../schema');
const adduser = require('../util/adduser');
const testtoken = require('../util/testtoken');

/**
 * Permet à l'utilisateur de s'inscrire.
 * Paramètres :
 * prenom (String) : prénom de l'utilisateur
 * nom (String) : nom de l'utilisateur
 * email (String) : email (valide) de l'utilisateur
 * password (String) : password clair de l'utilisateur
 * phone (String) : numéro de téléphone de l'utilisateur.
 */
router.post('/signup', function(req, res) {
  if(!req.body.username || !req.body.email || !req.body.password) {
    res.status(400).json({
      code: 'invalid_request',
    });
  }
  else {
    adduser({username: req.body.username, email: req.body.email, password: req.body.password })
      .then((user) => {
        user.save()
          .then(async (user) => {
            res.status(200).json({
              code: 'success',
              token: await user.getToken(),
            });
          })
          .catch(err => {
            console.error(err);
            res.status(500).json({
              text: 'internal_error',
            });
          });
      }).catch((err) => {
        res.status(err.code).json({
          code: err.text,
        });
      });
  }
});

/**
 * Permet à l'utilisateur de se connecter.
 * Paramètres :
 * email (String) : adresse mail
 * password (String) : mot de passe en clair
 */
router.post('/signin', async (req, res) => {
  try {
    if(!req.body.email || !req.body.password) {
      res.status(400).json({code: 'invalid_request'});
      return;
    }
    else {
      const email = req.body.email;
      const password = req.body.password;
      const result = await User.findOne({
        email,
      }, '+password').exec();

      if(!result) {
        res.status(401).json({
          code: 'bad_credentials',
        });
      }
      else {
        // console.log(result.getToken());
        const goodPassword = await result.authenticate(password);
        if(!goodPassword) {
          res.status(401).json({
            code: 'bad_credentials',
          });
        }
        else if(result.isBanned()) {
          res.status(401).json({
            code: 'banned',
          });
        }
        else {
          res.status(200).json({
            code: 'success',
            token: await result.getToken(),
          });
        }
      }
    }
  }
  catch(error) {
    console.error(error);
    res.status(500).json({
      code: 'internal_error',
    });
  }
});

/**
 * Permet d'obtenir les informations d'un utilisateur.
 * Paramètres :
 * token (String) : Token de l'utilisateur
 * id (ID sous forme de String) : Identifiant de l'utilisateur (facultatif, si non spécifié, retourne les infos de l'utilisateur connecté).
 * admin (Booléen) : Permet de dire si l'on souhaite davantage d'informations sur l'utilisateur. L'utilisateur dont on envoie le token doit alors ̂être admin (facultatif, faux par défaut).
 */
router.get('/get', (req, res) => {
  if(!req.query.token) {
    res.status(400).json({code: 'invalid_request'});
  }
  else {
    testtoken(req.query.token)
      .then(tokenData => {
        const autoMode = req.query.id ? false : true;
        const userid = autoMode ? tokenData.id : req.query.id;
        const adminInfos = req.query.admin;
        User.findById(tokenData.id)/*.lean({virtuals: true})*/.exec(async (err, askingUser) => {
          if(err) {
            console.error(err);
            res.status(500).json({code: 'internal_error'});
          }
          else if(!askingUser) {
            res.status(403).json({code: 'invalid_token'});
          }
          else if(askingUser.isBanned()) {
            res.status(403).json({code: 'invalid_token'});
          }
          else if(adminInfos && !askingUser.isAdmin()) {
            res.status(403).json({code: 'not_admin'});
          }
          else if(autoMode) {
            askingUser.avatar_url = askingUser.avatar;
            res.status(200).json({code: 'success', user: await askingUser.toObject({virtuals: true})});
          }
          else {
            const projection = adminInfos ? '' : '-status';
            User.findById(userid, projection).exec(async (err, askedUser) => {
              if(err) {
                console.error(err);
                res.status(500).json({code: 'internal_error'});
              }
              else if(!askedUser) {
                res.status(404).json({code: 'user_not_found'});
              }
              else {
                const askedObject = await askedUser.toObject({virtuals: true});
                if(!adminInfos) {
                  askedObject.email = undefined;
                }
                res.status(200).json({code: 'success', user: askedObject});
              }
            });
          }
        });
      })
      .catch(() => {
        res.status(403).json({code: 'invalid_token'});
      });
  }
});

module.exports = router;
