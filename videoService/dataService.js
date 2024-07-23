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

    async putViewerData(viewerID, userID, lastUpdate, viewerTime, newViewerData) {
        // Create a URLSearchParams object
        const params = new URLSearchParams({
            viewerID: viewerID,
            userID: userID,
            lastUpdate: lastUpdate,
            viewerTime: viewerTime
        });
    
        // Convert newViewerData to a JSON string
        const gameDataJSON = JSON.stringify(newViewerData);
    
        // Append the base URL with the search parameters
        const url = `${location.protocol}//localhost:3000/viewerData?${params.toString()}`;
    
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.authToken
            },
            // Include gameData in the request body
            body: gameDataJSON
        });
    
        return await response.json();
    }
}
