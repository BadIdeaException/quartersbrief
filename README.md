# Word of Warships Quarters Brief

This project is intended as an information tool for the popular video game [World of Warships](https://worldofwarships.eu/). While the game is easy enough to get started on, playing it well requires knowing a vast amount of information about ships' capabilities, quirks and technical data. This project provides that information, restricted to that which is actually pertinent to the current battle, saving you the trouble of having to memorize half of the [World of Warships wiki](https://wiki.wargaming.net/en/World_of_Warships).

## Use

### Installing

#### On Linux (as a package)

The easiest way to install is through the .deb package provided with each release. Provided you already have added `i386` as a foreign architecture, and NodeJS is available in your package repositories in version 17 or higher, all you need to do is run 
```
sudo apt install ~/Downloads/quartersbrief_<x.y.z>_amd64.deb
```
replacing x.y.z with the version you downloaded.

To add `i386` as a foreign architecture, run:
```
sudo dpkg --add-architecture i386 && sudo apt update
```
before installing. 

NodeJS is available in the distro repositories, but usually in a version that is quite old. A newer PPA is maintained among others at [nodesource](https://github.com/nodesource/distributions/blob/master/README.md). To use it, run:
```
curl -fsSL https://deb.nodesource.com/setup_17.x | sudo -E bash -
```

#### On Linux (from source)

Quartersbrief depends on wine to perform automatic updates of its data whenever the game updates. Unfortunately, this makes the disk footprint quite large. If you don't want this, you can install from source and disable automatic updates. You will still need NodeJS v17 or higher. 

Download the source of the release and unzip it. Then run `npm install --production && npm link`. After that, run quartersbrief with the `--update-policy=never` option.

Fairly current game data can be downloaded from the [World of Warships Fitting Tool repository](https://github.com/EdibleBug/WoWSFT-Kotlin/tree/master/WoWSFT-Data/src/main/resources/json/live). Usually game updates are reflected here within a few days. Save these files to `~/.local/share/quartersbrief`. 

### Configuring (program)

While all ways to configure quartersbrief are available as command-line options (run `quartersbrief --help`), the easiest way to configure is by editing the `quartersbrief.json` configuration file in the `quartersbrief` sub-folder of your user configuration directory. Most options are set to sensible defaults, but two in particular will probably require your attention:

1. `wowsdir`: Set this to your World of Warships root directory. (This is the directory that contains `WorldOfWarships.exe`.)
2. `application_id`: If you have a Wargaming.net API key, set it here. The program comes without a pre-configured one, because Wargaming forbids sharing API keys in their terms and conditions, so you will have to go through the trouble of obtaining one yourself if you want to see player information in your briefings.

### Configuring (agendas)

See (TBC)

### Running 

Just run `quartersbrief`.

## Development

### Cloning the project

```
git clone git@github.com:BadIdeaException/quartersbrief.git
npm install
```

This project is intended to be run inside a [Vagrant](https://www.vagrantup.com/) virtual machine to ensure a consistent, easily reproducable and readily replacable environment for tests and tryouts. To start this virtual machine, after cloning,
run 

``` 
vagrant up
```

### Running tests

```
npm test
```

Tests include integration testing that hits the actual live online Wargaming API. These require an API key. This can be provided in three ways:

1. By setting it in the environment variable `WG_APPLICATION_ID`
2. By passing it as an argument using `--application_id`. (Note: When using `npm`, you need to add a double hyphen `--` before this option, e.g. `npm test -- --application_id=12345`.)
3. By putting it in a file called `wg-application-id.secret` in the project's root folder. `*.secret` files are listed in `.gitignore`, so this is safe to do.

See [Wargaming.net Developer's Guide](https://developers.wargaming.net/documentation/guide/principles/) on how to get an application id.

### Starting

Run `node quartersbrief.js` to start the server, then navigate your browser to `localhost:10000`. The virtual machine exposes this port, so you can do it from the host.

With the development configuration, `quartersbrief` looks for World of Warhips in the folder `/opt/World_of_Warships` on the virtual machine. (Notice the underscores because of [this bug](https://github.com/hashicorp/vagrant/issues/12697).) You can create a folder called `wows` on the project's root folder, and it will get shared to that location. By putting a `tempArenaInfo.json` in a subfolder called `replays`, you can simulate a running battle. (The game generates this file whenever a battle is started and deletes it when the battle ends, so you can just copy it during the battle.)

### Debugging

The virtual machine exposes port 9229 to enable remote debugging from a graphical debugger. Run
```
npm run debug
```
(or `npm run debug-test` for debugging the tests).

There are also commands for using the built-in Node.js debugger. Append `-local` to `debug` for this, i.e. `npm run debug-local` or `npm run debug-local-test`.

### Releases

This project uses [grunt-bump](https://www.npmjs.com/package/grunt-bump) for handling releases. See there for usage instructions. 

Releasing involves operations on this repo, which require an access token. See [Creating a personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use) for how to generate one. To use it, either

1. set it as an environment variable `GITHUB_ACCESS_TOKEN`, or
2. put it into a file called `github-access-token-secret` in the project's root folder. The environment variable will then automatically be set any time you do `vagrant up`.

### Contributing and style guide

I am developing this project as a one-man show at the moment. If you have suggestions, feedback, or want to contribute, reach out through the issues. Pull requests are welcome, but expected to be fully tested and (obviously) passing.

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality.