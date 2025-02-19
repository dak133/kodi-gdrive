// DÁN GIÁ TRỊ CLIENT_ID, CLIENT_SERECT, REFRESH_TOKEN CỦA BẠN

var GOOGLE_CLIENT_ID = 'Nhập giá trị của bạn';
var GOOGLE_CLIENT_SECRET = 'Nhập giá trị của bạn';
var GOOGLE_REFRESH_TOKEN = 'Nhập giá trị của bạn';

var YOUR_ACCESS = {
	USERNAME: 'admin',
	PASSWORD: 'admin',
};

// -- không thay đổi bất kỳ nội dung gì phía dưới này --

export default {
	async fetch(request, env, ctx) {
		return handleRequest(request);
	},
};

var authConfig = {
	siteName: 'GDrive',
	version: '1.0',
	theme: 'material',
	main_color: 'deep-purple',
	accent_color: 'indigo',
	dark_theme: false,
	client_id: GOOGLE_CLIENT_ID,
	client_secret: GOOGLE_CLIENT_SECRET,
	refresh_token: GOOGLE_REFRESH_TOKEN,
	withPassword: `${YOUR_ACCESS.USERNAME}:${YOUR_ACCESS.PASSWORD}`,
	roots: [
		{
			id: '0ALXn0u0sR9k4Uk9PVA',
			name: 'MCU1',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		{
			id: '0ANem0ubRiFmlUk9PVA',
			name: 'MCU2',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		{
			id: '0AHd2pm6AneS7Uk9PVA',
			name: 'MCU3',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		{
			id: '0AO7ULgT6aYR4Uk9PVA',
			name: 'MCU4',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		{
			id: '0AO7ULgT6aYR4Uk9PVA',
			name: 'Trả RQ Phim',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		{
			id: '0AANFVqpT3wVBUk9PVA',
			name: 'Animation',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		{
			id: '0AF0WXiRXmMm4Uk9PVA',
			name: 'Movies',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		{
			id: '0AO5hltqyFhaPUk9PVA',
			name: 'TVShows',
			user: YOUR_ACCESS.USERNAME,
			pass: YOUR_ACCESS.PASSWORD,
		},
		//   {
		// 	id: 'YOUR_FOLDER_ID',
		// 	name: 'YOUR_FOLDER_NAME',
		// 	user: YOUR_ACCESS.USERNAME,
		// 	pass: YOUR_ACCESS.PASSWORD
		//   }
	],
	files_list_page_size: 500,
	search_result_list_page_size: 50,
	enable_cors_file_down: false,
	enable_password_file_verify: false,
};

/**
 * global functions
 */
const FUNCS = {
	/**
	 * Transform into relatively safe search keywords for Google search morphology
	 */
	formatSearchKeyword: function (keyword) {
		let nothing = '';
		let space = ' ';
		if (!keyword) return nothing;
		return keyword
			.replace(/(!=)|['"=<>/\\:]/g, nothing)
			.replace(/[,，|(){}]/g, space)
			.trim();
	},
};

/**
 * global consts
 * @type {{folder_mime_type: string, default_file_fields: string, gd_root_type: {share_drive: number, user_drive: number, sub_folder: number}}}
 */
const CONSTS = new (class {
	default_file_fields = 'parents,id,name,mimeType,modifiedTime,createdTime,fileExtension,size';
	gd_root_type = {
		user_drive: 0,
		share_drive: 1,
		sub_folder: 2,
	};
	folder_mime_type = 'application/vnd.google-apps.folder';
})();

// gd instances
var gds = [];

function html(current_drive_order = 0, model = {}) {
	return `
  <!DOCTYPE html>
  <html>
  <head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0,maximum-scale=1.0, user-scalable=no"/>
	<title>${authConfig.siteName}</title>
	<script>
	  window.drive_names = JSON.parse('${JSON.stringify(authConfig.roots.map((it) => it.name))}');
	  window.MODEL = JSON.parse('${JSON.stringify(model)}');
	  window.current_drive_order = ${current_drive_order};
	</script>
	<script>var main_color = "${authConfig.main_color}";var accent_color = "${authConfig.accent_color}";var dark = ${
		authConfig.dark_theme
	};</script>
	<script>var withPassword="${authConfig.withPassword}"</script>
	<script
	src="https://code.jquery.com/jquery-3.7.1.min.js"
	integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
	crossorigin="anonymous"></script>
	<script src="//cdn.jsdelivr.net/combine/gh/jquery/jquery@3.2/dist/jquery.min.js,gh/thangnqs/kodi-gdrive/worker/cdn/app.js"></script>
	<script src="//cdnjs.cloudflare.com/ajax/libs/mdui/0.4.3/js/mdui.min.js"></script>
  </head>
  <body>
  </body>
  </html>
  `;
}

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
	if (gds.length === 0) {
		for (let i = 0; i < authConfig.roots.length; i++) {
			const gd = new googleDrive(authConfig, i);
			await gd.init();
			gds.push(gd);
		}
		// This operation is parallel to improve efficiency
		let tasks = [];
		gds.forEach((gd) => {
			tasks.push(gd.initRootType());
		});
		for (let task of tasks) {
			await task;
		}
	}

	// Extract drive order from path
	// and get the corresponding gd instance according to the drive order
	let gd;
	let url = new URL(request.url);
	let path = url.pathname;

	/**
	 * Redirect to start page
	 * @returns {Response}
	 */
	function redirectToIndexPage() {
		return new Response('', { status: 301, headers: { Location: `${url.origin}/0:/` } });
	}

	if (path == '/') return redirectToIndexPage();
	if (path.toLowerCase() == '/favicon.ico') {
		// You can find one later favicon
		return new Response('', { status: 404 });
	}

	// Special command format
	const command_reg = /^\/(?<num>\d+):(?<command>[a-zA-Z0-9]+)$/g;
	const match = command_reg.exec(path);
	if (match) {
		const num = match.groups.num;
		const order = Number(num);
		if (order >= 0 && order < gds.length) {
			gd = gds[order];
		} else {
			return redirectToIndexPage();
		}
		const command = match.groups.command;
		// Search
		if (command === 'search') {
			if (request.method === 'POST') {
				// search results
				return handleSearch(request, gd);
			} else {
				const params = url.searchParams;
				// Search Page
				return new Response(
					html(gd.order, {
						q: params.get('q') || '',
						is_search_page: true,
						root_type: gd.root_type,
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'text/html; charset=utf-8' },
					}
				);
			}
		} else if (command === 'id2path' && request.method === 'POST') {
			return handleId2Path(request, gd);
		}
	}

	// Desired path format
	const common_reg = /^\/\d+:\/.*$/g;
	try {
		if (!path.match(common_reg)) {
			return redirectToIndexPage();
		}
		let split = path.split('/');
		let order = Number(split[1].slice(0, -1));
		if (order >= 0 && order < gds.length) {
			gd = gds[order];
		} else {
			return redirectToIndexPage();
		}
	} catch (e) {
		return redirectToIndexPage();
	}

	// basic auth
	for (const r = gd.basicAuthResponse(request); r; ) return r;

	path = path.replace(gd.url_path_prefix, '') || '/';
	if (request.method == 'POST') {
		return apiRequest(request, gd);
	}

	let action = url.searchParams.get('a');

	if (path.substr(-1) == '/' || action != null) {
		return new Response(html(gd.order, { root_type: gd.root_type }), {
			status: 200,
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
	} else {
		if (path.split('/').pop().toLowerCase() == '.password') {
			return new Response('', { status: 404 });
		}
		let file = await gd.file(path);
		let range = request.headers.get('Range');
		const inline_down = 'true' === url.searchParams.get('inline');
		return gd.down(file.id, range, inline_down);
	}
}

async function apiRequest(request, gd) {
	let url = new URL(request.url);
	let path = url.pathname;
	path = path.replace(gd.url_path_prefix, '') || '/';

	let option = { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } };

	if (path.substr(-1) == '/') {
		let form = await request.formData();
		// This can increase the speed of the first listing. The disadvantage is that if the password verification fails, the overhead of listing directories will still be incurred
		let deferred_list_result = gd.list(path, form.get('page_token'), Number(form.get('page_index')));

		// check .password file, if `enable_password_file_verify` is true
		if (authConfig['enable_password_file_verify']) {
			let password = await gd.password(path);
			// console.log("dir password", password);
			if (password && password.replace('\n', '') !== form.get('password')) {
				let html = `{"error": {"code": 401,"message": "password error."}}`;
				return new Response(html, option);
			}
		}

		let list_result = await deferred_list_result;
		return new Response(JSON.stringify(list_result), option);
	} else {
		let file = await gd.file(path);
		let range = request.headers.get('Range');
		return new Response(JSON.stringify(file));
	}
}

// Deal With search
async function handleSearch(request, gd) {
	const option = { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } };
	let form = await request.formData();
	let search_result = await gd.search(form.get('q') || '', form.get('page_token'), Number(form.get('page_index')));
	return new Response(JSON.stringify(search_result), option);
}

/**
 * Deal With id2path
 * @param request Id parameter required
 * @param gd
 * @returns {Promise<Response>} [Note] If the item represented by the id received from the front desk is not under the target gd disk, then the response will be returned to the front desk with an empty string ""
 */
async function handleId2Path(request, gd) {
	const option = { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } };
	let form = await request.formData();
	let path = await gd.findPathById(form.get('id'));
	return new Response(path || '', option);
}

class googleDrive {
	constructor(authConfig, order) {
		// Each disk corresponds to an order, corresponding to a gd instance
		this.order = order;
		this.root = authConfig.roots[order];
		this.url_path_prefix = `/${order}:`;
		this.authConfig = authConfig;
		// TODO: The invalid refresh strategy of these caches can be formulated later
		// path id
		this.paths = [];
		// path file
		this.files = [];
		// path pass
		this.passwords = [];
		// id <-> path
		this.id_path_cache = {};
		this.id_path_cache[this.root['id']] = '/';
		this.paths['/'] = this.root['id'];
		/*if (this.root['pass'] != "") {
		this.passwords['/'] = this.root['pass'];
	  }*/
		// this.init();
	}

	/**
	 * Initial authorization; then obtain user_drive_real_root_id
	 * @returns {Promise<void>}
	 */
	async init() {
		await this.accessToken();
		/*await (async () => {
		  // Get only 1 time
		  if (authConfig.user_drive_real_root_id) return;
		  const root_obj = await (gds[0] || this).findItemById('root');
		  if (root_obj && root_obj.id) {
			  authConfig.user_drive_real_root_id = root_obj.id
		  }
	  })();*/
		// Wait for user_drive_real_root_id and only get it once
		if (authConfig.user_drive_real_root_id) return;
		const root_obj = await (gds[0] || this).findItemById('root');
		if (root_obj && root_obj.id) {
			authConfig.user_drive_real_root_id = root_obj.id;
		}
	}

	/**
	 * Get the root directory type, set to root_type
	 * @returns {Promise<void>}
	 */
	async initRootType() {
		const root_id = this.root['id'];
		const types = CONSTS.gd_root_type;
		if (root_id === 'root' || root_id === authConfig.user_drive_real_root_id) {
			this.root_type = types.user_drive;
		} else {
			const obj = await this.getShareDriveObjById(root_id);
			this.root_type = obj ? types.share_drive : types.sub_folder;
		}
	}
	/**
	 * Returns a response that requires authorization, or null
	 * @param request
	 * @returns {Response|null}
	 */
	basicAuthResponse(request) {
		const user = this.root.user || '',
			pass = this.root.pass || '',
			_401 = new Response('Unauthorized', {
				headers: { 'WWW-Authenticate': `Basic realm="goindex:drive:${this.order}"` },
				status: 401,
			});
		if (user || pass) {
			const auth = request.headers.get('Authorization');
			if (auth) {
				try {
					const [received_user, received_pass] = atob(auth.split(' ').pop()).split(':');
					return received_user === user && received_pass === pass ? null : _401;
				} catch (e) {}
			}
		} else return null;
		return _401;
	}

	async down(id, range = '', inline = false) {
		let url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
		let requestOption = await this.requestOption();
		requestOption.headers['Range'] = range;
		let res = await fetch(url, requestOption);
		const { headers } = (res = new Response(res.body, res));
		this.authConfig.enable_cors_file_down && headers.append('Access-Control-Allow-Origin', '*');
		inline === true && headers.set('Content-Disposition', 'inline');
		return res;
	}

	async file(path) {
		if (typeof this.files[path] == 'undefined') {
			this.files[path] = await this._file(path);
		}
		return this.files[path];
	}

	async _file(path) {
		let arr = path.split('/');
		let name = arr.pop();
		name = decodeURIComponent(name).replace(/\'/g, "\\'");
		let dir = arr.join('/') + '/';
		// console.log(name, dir);
		let parent = await this.findPathId(dir);
		// console.log(parent);
		let url = 'https://www.googleapis.com/drive/v3/files';
		let params = { includeItemsFromAllDrives: true, supportsAllDrives: true };
		params.q = `'${parent}' in parents and name = '${name}' and trashed = false`;
		params.fields = 'files(id, name, mimeType, size ,createdTime, modifiedTime, iconLink, thumbnailLink)';
		url += '?' + this.enQuery(params);
		let requestOption = await this.requestOption();
		let response = await fetch(url, requestOption);
		let obj = await response.json();
		// console.log(obj);
		return obj.files[0];
	}

	// Cache through reqeust cache
	async list(path, page_token = null, page_index = 0) {
		if (this.path_children_cache == undefined) {
			// { <path> :[ {nextPageToken:'',data:{}}, {nextPageToken:'',data:{}} ...], ...}
			this.path_children_cache = {};
		}

		if (this.path_children_cache[path] && this.path_children_cache[path][page_index] && this.path_children_cache[path][page_index].data) {
			let child_obj = this.path_children_cache[path][page_index];
			return {
				nextPageToken: child_obj.nextPageToken || null,
				curPageIndex: page_index,
				data: child_obj.data,
			};
		}

		let id = await this.findPathId(path);
		let result = await this._ls(id, page_token, page_index);
		let data = result.data;
		// Cache multiple pages
		if (result.nextPageToken && data.files) {
			if (!Array.isArray(this.path_children_cache[path])) {
				this.path_children_cache[path] = [];
			}
			this.path_children_cache[path][Number(result.curPageIndex)] = {
				nextPageToken: result.nextPageToken,
				data: data,
			};
		}

		return result;
	}

	async _ls(parent, page_token = null, page_index = 0) {
		// console.log("_ls", parent);

		if (parent == undefined) {
			return null;
		}
		let obj;
		let params = { includeItemsFromAllDrives: true, supportsAllDrives: true };
		params.q = `'${parent}' in parents and trashed = false AND name !='.password'`;
		params.orderBy = 'folder,name,modifiedTime desc';
		params.fields = 'nextPageToken, files(id, name, mimeType, size , modifiedTime)';
		params.pageSize = this.authConfig.files_list_page_size;

		if (page_token) {
			params.pageToken = page_token;
		}
		let url = 'https://www.googleapis.com/drive/v3/files';
		url += '?' + this.enQuery(params);
		let requestOption = await this.requestOption();
		let response = await fetch(url, requestOption);
		obj = await response.json();

		return {
			nextPageToken: obj.nextPageToken || null,
			curPageIndex: page_index,
			data: obj,
		};

		/*do {
		  if (pageToken) {
			  params.pageToken = pageToken;
		  }
		  let url = 'https://www.googleapis.com/drive/v3/files';
		  url += '?' + this.enQuery(params);
		  let requestOption = await this.requestOption();
		  let response = await fetch(url, requestOption);
		  obj = await response.json();
		  files.push(...obj.files);
		  pageToken = obj.nextPageToken;
	  } while (pageToken);*/
	}

	async password(path) {
		if (this.passwords[path] !== undefined) {
			return this.passwords[path];
		}

		// console.log("load", path, ".password", this.passwords[path]);

		let file = await this.file(path + '.password');
		if (file == undefined) {
			this.passwords[path] = null;
		} else {
			let url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
			let requestOption = await this.requestOption();
			let response = await this.fetch200(url, requestOption);
			this.passwords[path] = await response.text();
		}

		return this.passwords[path];
	}

	/**
	 * Get share drive information by id
	 * @param any_id
	 * @returns {Promise<null|{id}|any>} Any abnormal situation returns null
	 */
	async getShareDriveObjById(any_id) {
		if (!any_id) return null;
		if ('string' !== typeof any_id) return null;

		let url = `https://www.googleapis.com/drive/v3/drives/${any_id}`;
		let requestOption = await this.requestOption();
		let res = await fetch(url, requestOption);
		let obj = await res.json();
		if (obj && obj.id) return obj;

		return null;
	}

	/**
	 * search for
	 * @returns {Promise<{data: null, nextPageToken: null, curPageIndex: number}>}
	 */
	async search(origin_keyword, page_token = null, page_index = 0) {
		const types = CONSTS.gd_root_type;
		const is_user_drive = this.root_type === types.user_drive;
		const is_share_drive = this.root_type === types.share_drive;

		const empty_result = {
			nextPageToken: null,
			curPageIndex: page_index,
			data: null,
		};

		if (!is_user_drive && !is_share_drive) {
			return empty_result;
		}
		let keyword = FUNCS.formatSearchKeyword(origin_keyword);
		if (!keyword) {
			// The keyword is empty, return
			return empty_result;
		}
		let words = keyword.split(/\s+/);
		let name_search_str = `name contains '${words.join("' AND name contains '")}'`;

		// corpora is a personal drive for user and a team drive for drive. With driveId
		let params = {};
		if (is_user_drive) {
			params.corpora = 'user';
		}
		if (is_share_drive) {
			params.corpora = 'drive';
			params.driveId = this.root.id;
			// This parameter will only be effective until June 1, 2020. Afterwards shared drive items will be included in the results.
			params.includeItemsFromAllDrives = true;
			params.supportsAllDrives = true;
		}
		if (page_token) {
			params.pageToken = page_token;
		}
		params.q = `trashed = false AND name !='.password' AND (${name_search_str})`;
		params.fields = 'nextPageToken, files(id, name, mimeType, size , modifiedTime)';
		params.pageSize = this.authConfig.search_result_list_page_size;
		// params.orderBy = 'folder,name,modifiedTime desc';

		let url = 'https://www.googleapis.com/drive/v3/files';
		url += '?' + this.enQuery(params);
		// console.log(params)
		let requestOption = await this.requestOption();
		let response = await fetch(url, requestOption);
		let res_obj = await response.json();

		return {
			nextPageToken: res_obj.nextPageToken || null,
			curPageIndex: page_index,
			data: res_obj,
		};
	}

	/**
	 * Get the file object of the superior folder of this file or folder layer by layer. Note: It will be very slow! ! !
	 * Up to find the root directory (root id) of the current gd object
	 * Only consider a single upward chain.
	 * [Note] If the item represented by this id is not under the target gd disk, then this function will return null
	 *
	 * @param child_id
	 * @param contain_myself
	 * @returns {Promise<[]>}
	 */
	async findParentFilesRecursion(child_id, contain_myself = true) {
		const gd = this;
		const gd_root_id = gd.root.id;
		const user_drive_real_root_id = authConfig.user_drive_real_root_id;
		const is_user_drive = gd.root_type === CONSTS.gd_root_type.user_drive;

		// End point query id from bottom to top
		const target_top_id = is_user_drive ? user_drive_real_root_id : gd_root_id;
		const fields = CONSTS.default_file_fields;

		// [{},{},...]
		const parent_files = [];
		let meet_top = false;

		async function addItsFirstParent(file_obj) {
			if (!file_obj) return;
			if (!file_obj.parents) return;
			if (file_obj.parents.length < 1) return;

			// ['','',...]
			let p_ids = file_obj.parents;
			if (p_ids && p_ids.length > 0) {
				// its first parent
				const first_p_id = p_ids[0];
				if (first_p_id === target_top_id) {
					meet_top = true;
					return;
				}
				const p_file_obj = await gd.findItemById(first_p_id);
				if (p_file_obj && p_file_obj.id) {
					parent_files.push(p_file_obj);
					await addItsFirstParent(p_file_obj);
				}
			}
		}

		const child_obj = await gd.findItemById(child_id);
		if (contain_myself) {
			parent_files.push(child_obj);
		}
		await addItsFirstParent(child_obj);

		return meet_top ? parent_files : null;
	}

	/**
	 * Get the path relative to the root directory of this disk
	 * @param child_id
	 * @returns {Promise<string>} [Note] If the item represented by this id is not in the target gd disk, then this method will return an empty string ""
	 */
	async findPathById(child_id) {
		if (this.id_path_cache[child_id]) {
			return this.id_path_cache[child_id];
		}

		const p_files = await this.findParentFilesRecursion(child_id);
		if (!p_files || p_files.length < 1) return '';

		let cache = [];
		// Cache the path and id of each level found
		p_files.forEach((value, idx) => {
			const is_folder = idx === 0 ? p_files[idx].mimeType === CONSTS.folder_mime_type : true;
			let path =
				'/' +
				p_files
					.slice(idx)
					.map((it) => it.name)
					.reverse()
					.join('/');
			if (is_folder) path += '/';
			cache.push({ id: p_files[idx].id, path: path });
		});

		cache.forEach((obj) => {
			this.id_path_cache[obj.id] = obj.path;
			this.paths[obj.path] = obj.id;
		});

		/*const is_folder = p_files[0].mimeType === CONSTS.folder_mime_type;
	  let path = '/' + p_files.map(it => it.name).reverse().join('/');
	  if (is_folder) path += '/';*/

		return cache[0].path;
	}

	// Get file item based on id
	async findItemById(id) {
		const is_user_drive = this.root_type === CONSTS.gd_root_type.user_drive;
		let url = `https://www.googleapis.com/drive/v3/files/${id}?fields=${CONSTS.default_file_fields}${
			is_user_drive ? '' : '&supportsAllDrives=true'
		}`;
		let requestOption = await this.requestOption();
		let res = await fetch(url, requestOption);
		return await res.json();
	}

	async findPathId(path) {
		let c_path = '/';
		let c_id = this.paths[c_path];

		let arr = path.trim('/').split('/');
		for (let name of arr) {
			c_path += name + '/';

			if (typeof this.paths[c_path] == 'undefined') {
				let id = await this._findDirId(c_id, name);
				this.paths[c_path] = id;
			}

			c_id = this.paths[c_path];
			if (c_id == undefined || c_id == null) {
				break;
			}
		}
		// console.log(this.paths);
		return this.paths[path];
	}

	async _findDirId(parent, name) {
		name = decodeURIComponent(name).replace(/\'/g, "\\'");

		// console.log("_findDirId", parent, name);

		if (parent == undefined) {
			return null;
		}

		let url = 'https://www.googleapis.com/drive/v3/files';
		let params = { includeItemsFromAllDrives: true, supportsAllDrives: true };
		params.q = `'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${name}'  and trashed = false`;
		params.fields = 'nextPageToken, files(id, name, mimeType)';
		url += '?' + this.enQuery(params);
		let requestOption = await this.requestOption();
		let response = await fetch(url, requestOption);
		let obj = await response.json();
		if (obj.files[0] == undefined) {
			return null;
		}
		return obj.files[0].id;
	}

	async accessToken() {
		console.log('accessToken');
		if (this.authConfig.expires == undefined || this.authConfig.expires < Date.now()) {
			const obj = await this.fetchAccessToken();
			if (obj.access_token != undefined) {
				this.authConfig.accessToken = obj.access_token;
				this.authConfig.expires = Date.now() + 3500 * 1000;
			}
		}
		return this.authConfig.accessToken;
	}

	async fetchAccessToken() {
		console.log('fetchAccessToken');
		const url = 'https://www.googleapis.com/oauth2/v4/token';
		const headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
		};
		const post_data = {
			client_id: this.authConfig.client_id,
			client_secret: this.authConfig.client_secret,
			refresh_token: this.authConfig.refresh_token,
			grant_type: 'refresh_token',
		};

		let requestOption = {
			method: 'POST',
			headers: headers,
			body: this.enQuery(post_data),
		};

		const response = await fetch(url, requestOption);
		return await response.json();
	}

	async fetch200(url, requestOption) {
		let response;
		for (let i = 0; i < 3; i++) {
			response = await fetch(url, requestOption);
			console.log(response.status);
			if (response.status != 403) {
				break;
			}
			await this.sleep(800 * (i + 1));
		}
		return response;
	}

	async requestOption(headers = {}, method = 'GET') {
		const accessToken = await this.accessToken();
		headers['authorization'] = 'Bearer ' + accessToken;
		return { method: method, headers: headers };
	}

	enQuery(data) {
		const ret = [];
		for (let d in data) {
			ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
		}
		return ret.join('&');
	}

	sleep(ms) {
		return new Promise(function (resolve, reject) {
			let i = 0;
			setTimeout(function () {
				console.log('sleep' + ms);
				i++;
				if (i >= 2) reject(new Error('i>=2'));
				else resolve(i);
			}, ms);
		});
	}
}

String.prototype.trim = function (char) {
	if (char) {
		return this.replace(new RegExp('^\\' + char + '+|\\' + char + '+$', 'g'), '');
	}
	return this.replace(/^\s+|\s+$/g, '');
};
