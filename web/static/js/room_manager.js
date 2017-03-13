import Messages from "./messages"
import * as socket from './socket'
import * as cc from "./chat_channel"
import * as utils from './utils'
import sweetAlert from "./sweetalert.min"
import toastr from 'toastr'

const debug = true;
const new_message_unread_time = 5000;
const container = '.messages-box .wrapper ul'
// const animation = `<div class="loading-animation"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>`
// const loadmore = `<li class="load-more"></li>`

class RoomManager {
  constructor() {
    // $('body').off('click', '.mention-link[data-channel]')
    this.register_events()
    this.view_elem = $('.messages-box .wrapper')[0];
    if (this.view_elem) {
      this.rect = this.view_elem.getBoundingClientRect()
      this.focus = document.hasFocus();
      this.unread = ucxchat.unread;
      this.unread_list = [];
      this.new_message_ref = undefined;

      // this.is_loading = false
      // this.has_more = false
    }
  }

  get bounding() { return this.rect; }

  get has_focus() { return this.focus; }
  set has_focus(val) {
    if (val && this.new_message_ref) {
      clearTimeout(this.new_message_ref);
    }
    this.focus = val;
  }

  get is_unread() { return this.unread; }
  set is_unread(val) { this.unread = val; }

  render_room(resp) {
    if (debug) { console.log('render_room', resp) }
    $('.room-link').removeClass("active")
    // $('.messages-box').html(resp.box_html)
    // $('.messages-container .fixed-title h2').html(resp.header_html)
    $('.main-content').html(resp.html)
    ucxchat.channel_id = resp.channel_id
    ucxchat.room = resp.room_title
    ucxchat.display_name = resp.display_name
    ucxchat.room_route = resp.room_route
    if (resp.side_nav_html) {
      $('aside .rooms-list').html(resp.side_nav_html)
    }
    $('.room-title').html(ucxchat.display_name)
    $('.link-room-' + ucxchat.room).addClass("active")
    utils.scroll_bottom()
    roomchan.leave()
    socket.restart_socket()
  }
  toggle_favorite() {
    if (debug) { console.log('toggle_favorite') }
    // roomchan.push("room:favorite", {user_id: ucxchat.user_id, channel_id: ucxchat.channel_id})
    cc.put("/room/favorite")
      .receive("ok", resp => {
        $('.messages-container .fixed-title h2').html(resp.messages_html)
        $('aside .rooms-list').html(resp.side_nav_html)
      })
  }
  add_private(elem) {
    let username = elem.parent().attr('data-username')
    if (debug) { console.log('pvt-msg button clicked...', username) }
    // roomchan.push("room:add-direct", {username: username, user_id: ucxchat.user_id, channel_id: ucxchat.channel_id})
    cc.put("direct/" + username)
      .receive("ok", resp => {
        $('.messages-container .fixed-title h2').html(resp.messages_html)
        $('aside .rooms-list').html(resp.side_nav_html)
        ucxchat.channel_id = resp.channel_id
        ucxchat.room = resp.room
        ucxchat.display_name = resp.display_name
        ucxchat.room_route = resp.room_route
        // flex_bar.close_flex_tab()
        if ($('section.flex-tab').parent().hasClass('opened')) {
          $('section.flex-tab').html('').parent().removeClass('opened')
        }
        roomchan.leave()
        socket.restart_socket()
    })
  }
  update(msg) {
    console.log('update...', msg)
    let fname = msg.field_name
    if ( fname == "topic"  || fname == "title") {
      $('.room-' + fname).html(msg.value)
    } else if (fname == "name") {
      $('.room-title').html(msg.value)
      ucxchat.room = msg.value
      ucxchat.display_name = msg.value
      utils.replace_history()
    }

    $('.current-setting[data-edit="' + msg.field_name + '"]').html(msg.value)
    console.warn('RoomManager.update', msg)
  }
  room_mention(resp) {
    let parent = `a.open-room[data-name="${resp.room}"]`
    let elem = $(parent + ' span.unread')
    console.log('room_manager', resp, elem)
    if (elem.length == []) {
      $(parent).prepend(`<span class="unread">${resp.unread}</span>`)
    } else {
      elem.text(resp.unread)
    }
  }

  updateMentionsMarksOfRoom() {
    let dom = document

    let ticksBar = $(dom).find('.ticks-bar')
    $(dom).find('.ticks-bar > .tick').remove()

    let scrollTop = $(dom).find('.messages-box > .wrapper').scrollTop() - 50
    let totalHeight = $(dom).find('.messages-box > .wrapper > ul').height() + 40

    $('.messages-box .mention-link-me').each((index, item) => {
      let topOffset = $(item).offset().top + scrollTop
      let percent = 100 / totalHeight * topOffset
      if ($(item).hasClass('mention-link-all'))
        ticksBar.append('<div class="tick background-attention-color" style="top: '+percent+'%;"></div>')
      else
        ticksBar.append('<div class="tick background-primary-action-color" style="top: '+percent+'%;"></div>')
    })
  }

  count_unread() {
    var count = 0
    var p = this;
    this.unread_list.every(function(id) {
      if (p.is_visible($('#' + id))) {
        return false;
      } else {
        count++;
        return true;
      }
    })
    return count;
  }

  has_first_unread() {
    return $('.first-unread').length > 0;
  }

  hide_unread_bar() {
    let bar = $('.unread-bar')
    if (bar.length > 0) {
      bar.hide()
      this.unread = false
      this.unread_list = []
    }
  }

  is_first_unread_visible() {
    return this.is_visible($('.first-unread'))
  }

  is_unread_bar_visible() {
    return $('.unread-bar').is(':visible')
  }

  is_visible(jelem) {
    if (jelem.length > 0) {
      let elem = jelem[0]
      let eb = elem.getBoundingClientRect()
      if (eb.top > this.rect.top && eb.bottom < this.rect.bottom) {
        return true
      } else if (eb.top <= this.rect.top && eb.bottom >= this.rect.bottom) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }

  new_message(id) {
    if (!this.unread && !this.focus && !this.new_message_ref && !this.has_first_unread()) {
      this.new_message_ref = setTimeout(this.new_message_timeout, new_message_unread_time, this, id)
    }
    if (this.unread || this.new_message_ref) {
      if (debug) { console.log('new_message pushing id') }
      this.unread_list.push(id)
    } else {
      if (debug) { console.log('new_message not pushing id') }
    }
  }

  new_message_timeout(caller, id) {
    if (caller.new_message_ref) {
      $('#' + id)
        .addClass('first-unread')
        .addClass('first-unread-opaque');

      caller.is_unread = true;
      caller.new_message_ref = undefined;
      caller.push_channel('unread:set', {message_id: id})
    }
  }

  push_channel(message, args={}) {
    setTimeout(function() {
      cc.push(message, args)
    }, 20)
  }

  remove_unread() {
    if (debug) { console.log('remove_unread') }
    if (this.is_first_unread_visible() || !this.unread) {
      if (debug) { console.log('remove_unread removeing...') }
      this.remove_unread_class();
      this.unread = false;
    }
  }

  remove_unread_class() {
    if (this.has_first_unread()) {
      $('.first-unread').removeClass('first-unread first-unread-opaque')
      this.push_channel('unread:clear')
    }
  }

  new_room() {
    this.has_more = $('.messages-box li.load-more').length > 0
    // bind_scroller()
    this.updateMentionsMarksOfRoom()
    roomchan.on('room:open', resp => {
      utils.page_loading()
      $('.main-content').html(utils.loading_animation())
      this.open_room(resp.room, resp.room)
    })
  }

  bind_history_manager_scroll_event() {
    $('.messages-box .wrapper').bind('scroll', _.throttle((e) => {
      if (!roomHistoryManager.isLoading && (roomHistoryManager.hasMore || roomHistoryManager.hasMoreNext)) {
        if (roomHistoryManager.hasMore && e.currentTarget.scrollTop == 0)
          roomHistoryManager.getMore
        else if (roomHistoryManager.hasMoreNext && e.currentTarget.scrollTop >= e.currentTarget.scrollHeight - e.currentTarget.clientHeight)
          roomHistoryManager.getMoreNext
      }
    }, 200))
  }

  scroll_to(elem, offset = 0) {
    let msgbox = $('.messages-box .wrapper')
    let valof = msgbox.scrollTop().valueOf()
    let offtop = msgbox.offset().top
    let item_top = elem.offset().top
    let val = msgbox.scrollTop().valueOf() + item_top - msgbox.offset().top + offset
    $('.messages-box .wrapper').scrollTop(val)
    // $('.messages-box .wrapper').animate({
    //   scrollTop: val
    // }, 1000);
  }

  clear_unread() {
    setTimeout(function() {
      let parent = `a.open-room[data-name="${ucxchat.room}"]`
      $(parent + ' span.unread').remove()
    }, 1000)
  }

  open_room(room, display_name, callback) {
    cc.get("/room/" + room, {display_name: display_name, room: ucxchat.room})
      .receive("ok", resp => {
        console.log('open room response', resp)
        if (resp.redirect) {
          window.location = resp.redirect
        } else {
          this.render_room(resp)
          this.bind_history_manager_scroll_event()
        }
        if (callback) { callback() }
        utils.remove_page_loading()
      })
  }

  register_events() {
    this.bind_history_manager_scroll_event()

    $(window).on('focus', () => {
      this.clear_unread()
      console.log('room_manager focus')
    })
    .on('focus', () => {
      this.has_focus = true;
      systemchan.push('state:focus')
      if (debug) { console.log('focus') }
    })
    .on('blur', () => {
      this.has_focus = false;
      systemchan.push('state:blur')
      if (debug) { console.log('blur') }
    })

    $('body').on('click', 'a.open-room', e => {
      e.preventDefault();
      if (debug) { console.log('clicked a.open-room', e, $(e.currentTarget), $(e.currentTarget).attr('data-room')) }
      utils.page_loading()
      $('.main-content').html(utils.loading_animation())
      this.open_room($(e.currentTarget).attr('data-room'), $(e.currentTarget).attr('data-name'))
    })
    .on('click', 'a.toggle-favorite', e => {
      if (debug) { console.log('click a.toggle-favorite') }
      e.preventDefault();
      this.toggle_favorite()
    })
    .on('click', '.button.pvt-msg', e => {
      if (debug) { console.log('click .button.pvt-msg') }
      e.preventDefault();
      this.add_private(e.currentTarget)
    })
    .on('click', 'button.set-owner', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      cc.put("/room/set-owner/" + username)
        .receive("ok", resp => {
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'button.unset-owner', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      cc.put("/room/unset-owner/" + username)
        .receive("ok", resp => {
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'button.set-moderator', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      cc.put("/room/set-moderator/" + username)
        .receive("ok", resp => {
          if (resp.redirect) {
            window.location = resp.redirect
          }
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'button.unset-moderator', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      cc.put("/room/unset-moderator/" + username)
        .receive("ok", resp => {
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'button.unmute-user', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      cc.put("/room/unmute-user/" + username)
        .receive("ok", resp => {
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'button.unblock-user', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      cc.put("/room/unblock-user/" + username)
        .receive("ok", resp => {
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'button.block-user', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      cc.put("/room/block-user/" + username)
        .receive("ok", resp => {
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'button.mute-user', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      sweetAlert({
        title: gettext.are_you_sure,
        text: gettext.the_user_wont_able_type + ' ' + ucxchat.room,
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: gettext.yes_mute_user,
        closeOnConfirm: false
      },
      function(){
        cc.put("/room/mute-user/" + username)
          .receive("ok", resp => {
            swal({
                title: gettext.muted,
                text: gettext.the_user_wont_able_type + ' ' + ucxchat.room,
                type: 'success',
                timer: 2000,
                showConfirmButton: false,
            })
          })
          .receive("error", resp => {
            toastr.error(resp.error)
          })
      });
    })
    .on('click', 'button.remove-user', e => {
      let username = $(e.currentTarget).parent().attr('data-username')
      e.preventDefault()
      sweetAlert({
        title: gettext.are_you_sure,
        text: gettext.the_user_will_be_removed_from + ' ' + ucxchat.room,
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, remove user!",
        closeOnConfirm: false
      },
      function(){
        cc.put("/room/remove-user/" + username)
          .receive("ok", resp => {
            swal({
                title: gettext.removed,
                text: gettext.the_user_was_remove_from + ' ' + ucxchat.room,
                type: 'success',
                timer: 2000,
                showConfirmButton: false,
            })
          })
          .receive("error", resp => {
            toastr.error(resp.error)
          })
      });
    })
    .on('click', 'button.join', e => {
      cc.put("/room/join/" + ucxchat.username)
        .receive("ok", resp => {
        })
        .receive("error", resp => {
          toastr.error(resp.error)
        })
    })
    .on('click', 'a.open-room i.hide-room', e => {
      e.preventDefault()
      let room = $(e.currentTarget).closest('.open-room').data('room')
      // console.log('cliecked open-room', room)
      sweetAlert({
        title: gettext.are_you_sure,
        text: gettext.are_you_sure_you_want_to_hide_the_room + ' "' + room + '"?',
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: gettext.yes_hide_it,
        closeOnConfirm: false
      },
      function(){
        cc.put("/room/hide/" + room)
          .receive("ok", resp => {
            if (resp.redirect) {
              window.location = resp.redirect
            }
            // swal({
            //     timer: 1,
            //     showConfirmButton: false,
            // })
          })
          .receive("error", resp => {
            toastr.error(resp.error)
          })
      });
      return false
    })
    .on('click', 'a.open-room i.leave-room', e => {
      e.preventDefault()
      let room = $(e.currentTarget).closest('.open-room').data('room')
      console.log('cliecked leave-room', room)
      sweetAlert({
        title: gettext.are_you_sure,
        text: gettext.are_you_sure_leave_the_room + ' "' + room + '"?',
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: gettext.yes_leave_it,
        closeOnConfirm: false
      },
      function(){
        cc.put("/room/leave/" + room)
          .receive("ok", resp => {
            swal({
                title: gettext.left_the_room,
                text: gettext.you_have_left_the_room + " " + ucxchat.room,
                type: 'success',
                timer: 500,
                showConfirmButton: false,
            })
          })
          .receive("error", resp => {
            toastr.error(resp.error)
          })
      });
      return false
    })
    .on('click', '.mention-link[data-channel]', (e) => {
      e.preventDefault()
      let target = $(e.currentTarget)
      let room = target.data('channel')
      console.log('clicked channel link', room)
      this.open_room(room, room)
      return false
    })
    .on('click', 'button.jump-to', () => {
      if (debug) { console.log('jumpto', $('.first-unread').offset().top) }
      this.hide_unread_bar();
      this.unread = false
      let msgbox = $('.messages-box .wrapper')
      let valof = msgbox.scrollTop().valueOf()
      let first_top = $('.first-unread').offset().top
      let offtop = msgbox.offset().top
      let val = msgbox.scrollTop().valueOf() + $('.first-unread').offset().top - msgbox.offset().top
      if (debug) { console.log('going to scroll to', valof, first_top, offtop, val) }
      $('.messages-box .wrapper').animate({
        scrollTop: val
      }, 1500);
      // $('.first-unread').get(0).scrollIntoView();
    })
    .on('click', 'button.mark-read', () => {
      this.remove_unread_class();
      this.hide_unread_bar();

      let mypanel = $('.messages-box .wrapper')
      let val = myPanel[0].scrollHeight - myPanel.height();
      $('.messages-box .wrapper').animate({
        scrollTop: val
      }, 1500);
    })
    .on('click', 'li.jump-to-message', e => {
      e.preventDefault()
      let ct = e.currentTarget
      console.log('....', $(ct).closest('li.message'))
      let ts = $(ct).closest('li.message').data('timestamp')
      console.warn('ts', ts)
      let target = $('.messages-box li[data-timestamp="' + ts + '"]')
      if (target.offset()) {
        console.log("jump-to found an offset")
        scroll_to(target, -400)
      } else {
        roomHistoryManager.getSurroundingMessages(ts)
      }
      messageCog.close_cog($(ct))
    })
    .on('click', '.jump-recent', e => {
      messageCog.close_cog($(e.currentTarget))
      roomHistoryManager.getRecent()
    })
  }

  update_state(resp) {
    this.has_more = resp.has_more
    this.has_more_next = resp.has_more_next
  }

  // scroll() {
    // if (!this.isloading && this.has_more) {
    //     return
    //   } else if (utils.is_scroll_bottom()) {
    //     // console.log('reached the bottom')
    //     if (this.has_more_next) {

    //     } else {
    //        $('.jump-recent').hasClass('not')
    //     }
    //     $('.jump-recent').addClass('not')
    //   }
    // }
  //   if (this.unread) {
  //      if (debug) { console.log('scrolling unread') }
  //     if (this.is_first_unread_visible()) {
  //       if (debug) { console.log('hiding unread_bar') }

  //       if ($('.unread-bar').is(':visible')) {
  //         this.hide_unread_bar()
  //       }
  //     } else {
  //       let count = this.count_unread()
  //       if (!$('.unread-bar').is(':visible')) {
  //         $('.unread-bar').show()
  //         if (debug) { console.log('show unread bar') }
  //       } else {
  //         if (debug) { console.log('else dont show unread bar') }
  //       }
  //       $('.unread-cnt').html(count)
  //       if (debug) { console.log('count', count) }
  //     }
  //   } else {
  //      // if (debug) { console.log('scrolling no unread') }
  //   }
  // }
}

export default RoomManager;
