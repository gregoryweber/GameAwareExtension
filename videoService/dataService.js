export class DataService {
    constructor(authToken) {
        this.authToken = authToken;
    }

    async getStartData() {
        const response = await fetch(`${location.protocol}//localhost:3000/startData`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.authToken
            }
        });
        return await response.json();
    }

    async setUpInitialBuffer(backPadding) {
        const response = await fetch(`${location.protocol}//localhost:3000/initialBuffer?padding=${backPadding}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.authToken
            }
        });
        return await response.json();
    }

    async getLatestData() {
        const response = await fetch(`${location.protocol}//localhost:3000/latestData`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.authToken
            }
        });
        return await response.json();
    }
}
