const snekfetch = require('snekfetch');
const Package = require('../package.json');

const Util = require('./util/Util');
const Player = require('./Player');
const Match = require('./matches/Match');
const Status = require('./Status');
/**
 * The main hub for interacting with the pubg api, and starting point for any api instance
 * @class Client
 * @param {string} key PUBG app api token
 * @param {string} [defaultShard='pc-oc'] Default shard to use if none provided in methods
 */
class Client {
    constructor(key, defaultShard = 'pc-oc') {
        if (!key) {
            throw new Error('No API key passed.');
        }

        /**
         * The api key passed into the client
         * @type {string}
         */
        this.key = key;

        /**
         * The default shard for the client if none provided
         */
        this.defaultShard = defaultShard;
    }

    /**
     * Get player by the given id or name
     * @param {Object} args Specify what player to get
     * * {id: ['id1', 'id2']}
     * * {id: 'id'}
     * * {name: 'name'}
     * * {name: ['name1', 'name2']}
     * @param {string} [shard=this.defaultShard] The server shard to send the request to
     * @returns {Promise<Array<Player>>|Promise<Player>}
     * @memberof Client
     */
    getPlayer(args, shard = this.defaultShard) {
        if (typeof args !== 'object' || typeof shard !== 'string') throw new Error('Requires (object, !string)');

        if (args.id) {
            const url = Util.constructURL(Array.isArray(args.id) ? 'players' : `players/${args.id}`, shard);
            return this._baseRequest(url, Array.isArray(args.id) ? { 'filter[playerIds]': args.id.join(',') } : {})
                .then(players => Array.isArray(players.data) ? players.data.map(p => new Player(p, this)) : new Player(players.data, this))
                .catch(e => Promise.reject(e.body.errors));
        }
        if (args.name) {
            const names = Array.isArray(args.name) ? args.name.join(',') : args.name;
            return this._baseRequest(Util.constructURL('players', shard), { 'filter[playerNames]': names })
                .then(players => players.data.map(p => new Player(p, this)))
                .catch(e => Promise.reject(e.body.errors));
        }
        return Promise.reject(new Error('Invalid use of <Client>.getPlayer()'));
    }
    /**
     * Get a match from a match id
     * @param {string} id Id of the match to get
     * @param {string} [shard=this.defaultShard] The server shard to send the request to
     * @returns {Promise<Match>}
     * @memberof Client
     */
    getMatch(id, shard = this.defaultShard) {
        if (typeof id !== 'string' || typeof shard !== 'string') throw new Error('Requires (string, !string)');
        return this._baseRequest(Util.constructURL(`matches/${id}`, shard))
            .then(match => new Match(match.data, this, match.included))
            .catch(e => Promise.reject(e.body.errors));
    }

    /**
     * Gets the status of the api
     * @returns {Promise<Status>}
     * @memberof Client
     */
    getStatus() {
        return this._baseRequest(Util.constructURL('status'))
            .then(status => new Status(status.data))
            .catch(e => Promise.reject(e.body.errors));
    }

    /**
     * Gets the status of the api
     * @param {Date} [createdAt] The starting search date for the matches
     * @param {string} [shard=this.defaultShard] The server shard to send the request to
     * @returns {Promise<Array<Match>>}
     * @memberof Client
     */
    getSamples(createdAt, shard = this.defaultShard) {
        // eslint-disable-next-line
        return this._baseRequest(Util.constructURL('samples', shard), createdAt instanceof Date ? { 'filter[createdAt]': createdAt.toISOString() } : {})
            .then(samples => samples.data.relationships.matches.data.map(m => new Match(m.id, this)))
            .catch(e => Promise.reject(e.body.errors));
    }

    /**
     * Fetches telemetry data object
     * @param {string} url URL of the telemetry object
     * @returns {Promise<Object>}
     * @memberof Client
     */
    getTelemetry(url) {
        if (!url || typeof url !== 'string') throw new Error('Requires (string)');
        return this._baseRequest(url);
    }

    /**
     * Carries out a basic http request to the api
     * @private
     * @param {string} url Full url of the endpoint to target
     * @param {Object} [options={}] Snekfetch options
     * @returns {Promise<Object>}
     * @memberof Client
     */
    _baseRequest(url, options = {}) {
        return snekfetch.get(url)
            .set(this._headers)
            .query(options)
            .then(r => r.body);
    }

    get _headers() {
        return {
            'User-Agent': `pubg.js v${Package.version} (${Package.homepage})`,
            accept: 'application/json',
            Authorization: `Bearer ${this.key}`,
        };
    }
}

module.exports = Client;
