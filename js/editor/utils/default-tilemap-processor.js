function imageToType(imgId) {
	return imgId;
}

export default {
	imageToType,
	onTileEditCallback:(tilemap, x, y, type) => {
		tilemap.setTile(x, y, type);
	}
};