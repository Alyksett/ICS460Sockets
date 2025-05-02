# Running

1. Install node
2. run `npm install` in this root directory.
3. If you want to run another peer (and peer2), cd into peer and run `npm install`

The project is setup in the following way:
- `src/` holds all the code that is ran
- `peer/` is a *duplicate* version of source. **Do not modify anything in peer**. Also be sure if you're modifying something, you're not accidentally modifying something in `peer/`

There are three scripts for running:
1. `npm run start`: This builds and runs the `src/` contents
2. `npm run peer`: This copies the `src/` contents into `/peer` and builds and runs `/peer`. This can be used to start n instances for testing (Note: Currently two instances will work at max, but this can be updated to support n. If needed to run >2 instances, make a note to someone).
3. `npm run dual`: This runs BOTH `src/` and `/peer` at the same time.

## FEATURES:
- Login with username/cluster ID (Cluster ID === "server" or "room" [Not actually a server])
- Broadcast and direct messaging (When another user is online)
- Logging out once you're logged in (Can also log in)

## Developer Notes:

`index.ts` is the main connection to `index.html`/the front end. ALL interaction with HTML should be placed in here.
`handler.ts` is where the `Client` is defined and the "backend" resides. Note that `utils.ts` also holds some code related to 
`values.ts` holds constants.

`utils.ts` is a good place to see the "commands" or "routes". Note that all the functions (*.on("...", ...)) are **receiver** functions, i.e they handle the **receiving** of messages (There is also some cluster/peer sending happening).
